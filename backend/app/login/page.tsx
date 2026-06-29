import { redirect } from "next/navigation";
import { getHomePathByRole, getSession } from "@/lib/auth/session";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();

  if (session) {
    redirect(getHomePathByRole(session.rol));
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-6 py-10 text-slate-950">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">
            Sistema de presupuesto
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Iniciar sesion</h1>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "missing"
              ? "Ingresa usuario y contrasena."
              : "Usuario o contrasena incorrectos."}
          </div>
        ) : null}

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
            Contrasena
            <input
              name="password"
              type="password"
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-slate-900"
              autoComplete="current-password"
            />
          </label>

          <button className="mt-2 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            Entrar
          </button>
        </form>

        <div className="mt-6 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <p>Admin: admin / admin123</p>
          <p>Unidad: unidad.admin / unidad123</p>
        </div>
      </section>
    </main>
  );
}
