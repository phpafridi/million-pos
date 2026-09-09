'use client'
import React, { useState, useEffect } from "react";
import { AddBusinessProfile } from "./actions/AddBusinessProfile";
import { GetBusinessProfile } from "./actions/GetBusinessProfile";

import { toast } from "sonner"; // ✅ import toast

export default function BusinessProfile() {
  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    address: "",
    phone: "",
    logo: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Fetch business profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await GetBusinessProfile();
      if (profile) {
        setForm({
          company_name: profile.company_name || "",
          company_email: profile.email || "", // ✅ fixed
          address: profile.address || "",
          phone: profile.phone || "",
          logo: profile.logo || "",
        });
        if (profile.logo) {
          setPreview(`/api/uploads/${encodeURIComponent(profile.logo ?? 'default.jpg')}`);
          
        }
        if (profile.favicon) {
          setFaviconPreview(`/api/uploads/${encodeURIComponent(profile.favicon)}`);
        }
      }
    };
    fetchProfile();
  }, []);

  // Input handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleFavicon = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFavicon(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("company_name", form.company_name);
    formData.append("company_email", form.company_email);
    formData.append("address", form.address);
    formData.append("phone", form.phone);
    if (image) {
      formData.append("file", image);
    }
    if (favicon) {
      formData.append("favicon_file", favicon);
    }

    const result = await AddBusinessProfile(formData);

    if (result.success) {
      toast.success("Business details updated successfully!");
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <div className="right-side" style={{ minHeight: "945px" }}>
      <section className="content">
        <div className="row">
          <div className="col-md-12">
            <div className="box box-primary">
              <div className="box-header box-header-background with-border">
                <h3 className="box-title">General Settings</h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-8 col-sm-12 col-xs-12">
                    <div className="box-body">
                      {/* Company Name */}
                      <div className="form-group">
                        <label>
                          Company Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="company_name"
                          value={form.company_name}
                          onChange={handleChange}
                          placeholder="Company Name"
                          required
                          className="form-control"
                        />
                      </div>

                      {/* Company Email */}
                      <div className="form-group">
                        <label>
                          Company Email <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          name="company_email"
                          value={form.company_email}
                          onChange={handleChange}
                          placeholder="Company Email"
                          required
                          className="form-control"
                        />
                      </div>

                      {/* Address */}
                      <div className="form-group">
                        <label>
                          Address <span className="required">*</span>
                        </label>
                        <textarea
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          className="form-control autogrow"
                          required
                          placeholder="Business Address"
                        />
                      </div>

                      {/* Phone */}
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="number"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="Phone"
                          className="form-control"
                        />
                      </div>

                      {/* Logo */}
                      <div className="form-group">
                        <label>Company Logo</label>
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleImage}
                          className="form-control"
                        />
                      </div>

                      {/* Favicon */}
                      <div className="form-group">
                        <label>Favicon <small style={{ fontWeight: 400 }}>(browser tab icon — square image works best, e.g. 32×32 or 64×64)</small></label>
                        <input
                          type="file"
                          name="favicon"
                          accept="image/*"
                          onChange={handleFavicon}
                          className="form-control"
                        />
                        {faviconPreview && (
                          <img src={faviconPreview} alt="Favicon preview" style={{ width: 32, height: 32, marginTop: 8, borderRadius: 4 }} />
                        )}
                      </div>

                      {/* Preview */}
                      {preview && (
                        <div className="form-group">
                          <img
                            src={preview}
                            alt="Logo Preview"
                            width={150}
                            height={150}
                            className="img-thumbnail"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="box-footer">
                  <button type="submit" className="btn bg-navy btn-flat">
                    Save Business Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
