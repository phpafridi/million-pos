'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserByEmail } from "./actions/UserByEmail";
import { navigationMenus } from "./constants/navigationMenus";

type NavItem = {
  title: string;
  path?: string;
  children?: NavItem[];
};

interface UserRole {
  menu_name: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  password: string | null;
  flag: string | null;
  image: string | null;
  user_roles: UserRole[];
}

export default function EditForm({ email }: { email: string }) {
  const router = useRouter();
  const { data: session } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    user_type: "0",
    employee_image: "",
  });

  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);

  const isCurrentUser = session?.user?.email === decodeURIComponent(email);
  
  // fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const user: User | null = await UserByEmail(email);
      if (user) {
        setForm({
          name: user.name ?? "",
          email: user.email,
          password: "",
          user_type: user.flag ?? "0",
          employee_image: user.image ?? "",
        });
        setSelectedMenus(user.user_roles.map(r => r.menu_name));

        if (user.image) {
          setPreview(`/api/uploads/${encodeURIComponent(user.image ?? 'default.jpg')}`);
        }
      }
    };
    fetchUser();
  }, [email]);

  // collect menu paths recursively
  const collectPaths = (menu: NavItem): string[] => {
    let paths: string[] = [];
    if (menu.path) paths.push(menu.path);
    if (menu.children) menu.children.forEach(child => paths.push(...collectPaths(child)));
    return paths;
  };

  const handleCheckboxChange = (menu: NavItem, checked: boolean) => {
    const parentPath = menu.path || menu.title;
    const allPaths = [parentPath, ...collectPaths(menu)];
    setSelectedMenus(prev =>
      checked ? [...new Set([...prev, ...allPaths])] : prev.filter(p => !allPaths.includes(p))
    );
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("old_email", decodeURIComponent(email));   // IMPORTANT
    formData.append("email", form.email);
    formData.append("password", form.password);
    formData.append("user_type", form.user_type);
    if (image) formData.append("file", image);
    formData.append("menus", JSON.stringify(selectedMenus));

    const res = await fetch("/api/update-user", { method: "POST", body: formData });
    const data = await res.json();

    if (data?.error) setResponse(data.error);
    else router.push("/dashboard/employee/employee-list/");
  };

  // render menus; children only appear if parent is checked
  const renderMenus = (menus: NavItem[], level = 0) =>
    menus.map(menu => {
      const key = menu.path || menu.title;
      const checked = selectedMenus.includes(key);

      return (
        <div key={key} style={{ marginLeft: level * 20, marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => handleCheckboxChange(menu, e.target.checked)}
          />
          <label style={{ marginLeft: 5 }}>{menu.title}</label>

          {menu.children && checked && renderMenus(menu.children, level + 1)}
        </div>
      );
    });

  return (
    <div className="right-side" style={{ minHeight: 945 }}>
      <section className="content-header">
        <ol className="breadcrumb">
          <li><a href="#">Edit Employee</a></li>
          <li><a href="#">Employee Management</a></li>
        </ol>
      </section>

      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Update User</h3>
                </div>

                <form role="form" onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 border-right">
                      <div className="box-body">
                        <div className="form-group">
                          <label>Name *</label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>Email *</label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>Password</label>
                          <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>User Type</label>
                          <select
                            name="user_type"
                            value={form.user_type}
                            onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                            className="form-control"
                          >
                            <option value="0">User</option>
                            <option value="1">Admin</option>
                          </select>
                        </div>

                        {/* Image input & preview only for current user */}
                        {isCurrentUser && (
                          <>
                            <div className="form-group">
                              <label>Employee Image</label>
                              <input type="file" accept="image/*" onChange={handleImage} />
                            </div>

                            {preview && (
                              <div className="form-group">
                                <img
                                  src={preview}
                                  alt="Employee Preview"
                                  width={150}
                                  height={150}
                                  className="img-thumbnail"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {form.user_type === "0" && (
                      <div className="col-md-5 col-md-offset-1">
                        <div className="box-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <h4 style={{ margin: 0 }}>User Access Role:</h4>
                            <div>
                              <button
                                type="button"
                                className="btn btn-xs btn-success"
                                onClick={() => setSelectedMenus([])}
                                title="Clears all individual checkboxes — an empty list means unrestricted access to everything, same as a franchise/warehouse owner"
                              >
                                ✓ Grant Full Access
                              </button>
                            </div>
                          </div>
                          <p className="text-muted" style={{ fontSize: 12 }}>
                            "Grant Full Access" removes all individual restrictions — the account sees every page,
                            same as the automatically-created owner login for a new franchise or warehouse.
                            Use the checkboxes below instead if you want to limit this account to specific pages.
                          </p>
                          {renderMenus(navigationMenus)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="box-footer">
                    <button type="submit" className="btn bg-navy btn-flat">
                      Update
                    </button>
                  </div>
                </form>

                {response && (
                  <div style={{ marginTop: 10, color: "red" }}>{response}</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
