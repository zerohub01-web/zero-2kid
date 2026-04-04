"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import toast from "react-hot-toast";
import { Loader2, Save, Upload } from "lucide-react";
import { api } from "../../../lib/api";

interface SettingsForm {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  gstNumber: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  adminSignature: string;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export default function ZeroControlSettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    companyName: "ZERO OPS",
    companyPhone: "97469 27368",
    companyEmail: "Zerohub01@gmail.com",
    companyAddress: "Bangalore, Karnataka",
    gstNumber: "",
    upiId: "zerohub01@upi",
    bankName: "HDFC Bank",
    accountNumber: "",
    ifscCode: "",
    adminSignature: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/api/contracts/settings");
        setForm((prev) => ({
          ...prev,
          companyName: data?.companyName || prev.companyName,
          companyPhone: data?.companyPhone || prev.companyPhone,
          companyEmail: data?.companyEmail || prev.companyEmail,
          companyAddress: data?.companyAddress || prev.companyAddress,
          gstNumber: data?.gstNumber || "",
          upiId: data?.upiId || prev.upiId,
          bankName: data?.bankName || prev.bankName,
          accountNumber: data?.accountNumber || "",
          ifscCode: data?.ifscCode || "",
          adminSignature: data?.adminSignature || ""
        }));
      } catch (error) {
        console.error(error);
        toast.error("Unable to load settings.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 170 * window.devicePixelRatio;

    const context = canvas.getContext("2d");
    if (context) {
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.2,
      penColor: "#0f172a"
    });

    if (form.adminSignature) {
      signaturePadRef.current.fromDataURL(form.adminSignature);
    }

    return () => {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
    };
  }, [form.adminSignature]);

  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveSignatureToState = () => {
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Please draw signature first.");
      return;
    }
    setField("adminSignature", pad.toDataURL("image/png"));
    toast.success("Signature captured.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pad = signaturePadRef.current;
      const signature = pad && !pad.isEmpty() ? pad.toDataURL("image/png") : form.adminSignature;

      await api.put("/api/contracts/settings", {
        ...form,
        adminSignature: signature
      });

      setField("adminSignature", signature);
      toast.success("Settings saved.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[360px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <section className="space-y-5 pb-10">
      <header className="soft-card p-6">
        <h1 className="text-3xl font-display text-[var(--ink)]">Admin Settings</h1>
        <p className="text-sm text-[var(--muted)] mt-2">Manage company details, bank info, and the default signature used in all contracts.</p>
      </header>

      <article className="soft-card p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Company Profile</p>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="field py-2.5" placeholder="Company Name" value={form.companyName} onChange={(event) => setField("companyName", event.target.value)} />
          <input className="field py-2.5" placeholder="Company Phone" value={form.companyPhone} onChange={(event) => setField("companyPhone", event.target.value)} />
          <input className="field py-2.5" placeholder="Company Email" value={form.companyEmail} onChange={(event) => setField("companyEmail", event.target.value)} />
          <input className="field py-2.5" placeholder="GST Number" value={form.gstNumber} onChange={(event) => setField("gstNumber", event.target.value)} />
          <input className="field py-2.5 md:col-span-2" placeholder="Company Address" value={form.companyAddress} onChange={(event) => setField("companyAddress", event.target.value)} />
        </div>
      </article>

      <article className="soft-card p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Payment Details</p>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="field py-2.5" placeholder="Bank Name" value={form.bankName} onChange={(event) => setField("bankName", event.target.value)} />
          <input className="field py-2.5" placeholder="UPI ID" value={form.upiId} onChange={(event) => setField("upiId", event.target.value)} />
          <input className="field py-2.5" placeholder="Account Number" value={form.accountNumber} onChange={(event) => setField("accountNumber", event.target.value)} />
          <input className="field py-2.5" placeholder="IFSC Code" value={form.ifscCode} onChange={(event) => setField("ifscCode", event.target.value)} />
        </div>
      </article>

      <article className="soft-card p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Admin / Company Signature</p>
        <div className="rounded-xl border border-black/10 bg-white/60 p-3">
          <canvas ref={canvasRef} className="w-full h-40 rounded-lg bg-white border border-black/10" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs"
              onClick={() => {
                signaturePadRef.current?.clear();
                setField("adminSignature", "");
              }}
            >
              Clear
            </button>
            <button type="button" className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1" onClick={saveSignatureToState}>
              <Save size={12} /> Save Drawn Signature
            </button>
            <label className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1 cursor-pointer">
              <Upload size={12} /> Upload Signature
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await readAsDataURL(file);
                    setField("adminSignature", dataUrl);
                    toast.success("Signature image loaded.");
                  } catch {
                    toast.error("Failed to read image file.");
                  }
                }}
              />
            </label>
          </div>
        </div>
      </article>

      <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Settings
      </button>
    </section>
  );
}
