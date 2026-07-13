"use client";

import { useState } from "react";
import { loginAction } from "./actions";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={loginAction} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Usuario
        <input
          name="username"
          className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
          autoComplete="username"
        />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Contraseña
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 font-normal outline-none focus:border-slate-900"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </label>

      <button className="mt-2 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
        Entrar
      </button>
    </form>
  );
}
