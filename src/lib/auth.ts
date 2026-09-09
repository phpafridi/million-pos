import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import { checkLoginRateLimit, recordLoginAttempt, getClientIp } from "@/lib/loginRateLimit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        shopSlug: { label: "Shop", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email;
        const ip = getClientIp(req?.headers || {});

        const rateLimit = await checkLoginRateLimit(email, ip);
        if (!rateLimit.allowed) {
          // Deliberately don't touch the database further or record this
          // as another attempt — the whole point is to stop wasting work
          // on a request we've already decided to reject.
          throw new Error(rateLimit.reason);
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { user_roles: true },
        });

        if (!user || !user.password) {
          await recordLoginAttempt(email, ip, false);
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          await recordLoginAttempt(email, ip, false);
          return null;
        }

        const shop = user.shop_id ? await prisma.tbl_shop.findUnique({ where: { shop_id: user.shop_id }, select: { is_warehouse: true, login_slug: true } }) : null;

        // A franchise-specific login page (/login/[slug]) passes shopSlug —
        // reject anyone who isn't actually a member of that franchise, even
        // with correct credentials. Head Office can log in anywhere.
        if (credentials.shopSlug && !user.is_super_admin) {
          const loginShop = await prisma.tbl_shop.findUnique({ where: { login_slug: credentials.shopSlug } });
          if (!loginShop || user.shop_id !== loginShop.shop_id) {
            await recordLoginAttempt(email, ip, false);
            return null;
          }
        }

        await recordLoginAttempt(email, ip, true);

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
          flag: user.flag ?? null,
          roles: user.user_roles.map((r) => r.menu_name),
          shop_id: user.shop_id ?? null,
          is_super_admin: user.is_super_admin,
          is_warehouse: shop?.is_warehouse ?? false,
          login_slug: shop?.login_slug ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.image = (user as any).image;
        token.flag = (user as any).flag;
        token.roles = (user as any).roles;
        token.shop_id = (user as any).shop_id;
        token.is_super_admin = (user as any).is_super_admin;
        token.is_warehouse = (user as any).is_warehouse;
        token.login_slug = (user as any).login_slug;
        token.rolesCheckedAt = Date.now();
        return token;
      }

      // Re-check permissions from the database periodically (every 60s),
      // not just at login — otherwise editing an employee's access in
      // Edit Employee has zero effect until that employee logs out and
      // back in, since the JWT would keep serving whatever roles existed
      // at sign-in time for the entire life of the session.
      const lastChecked = (token.rolesCheckedAt as number) || 0;
      if (Date.now() - lastChecked > 60_000 && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: { user_roles: true },
        });
        if (dbUser) {
          token.roles = dbUser.user_roles.map((r) => r.menu_name);
          token.shop_id = dbUser.shop_id ?? null;
          token.is_super_admin = dbUser.is_super_admin;
          token.flag = dbUser.flag ?? null;
          if (dbUser.shop_id) {
            const shop = await prisma.tbl_shop.findUnique({ where: { shop_id: dbUser.shop_id }, select: { is_warehouse: true, login_slug: true } });
            token.is_warehouse = shop?.is_warehouse ?? false;
            token.login_slug = shop?.login_slug ?? null;
          } else {
            token.is_warehouse = false;
            token.login_slug = null;
          }
        }
        token.rolesCheckedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.image as string | null;
        (session.user as any).flag = token.flag as string | null;
        (session.user as any).roles = token.roles as string[];
        (session.user as any).shop_id = token.shop_id as number | null;
        (session.user as any).is_super_admin = token.is_super_admin as boolean;
        (session.user as any).is_warehouse = token.is_warehouse as boolean;
        (session.user as any).login_slug = token.login_slug as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
