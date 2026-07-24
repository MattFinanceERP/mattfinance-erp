"use client";

import type { ReactNode } from "react";
import { useAccess } from "./AccessProvider";

type PermissionGuardProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGuard({
  permission,
  children,
  fallback,
}: PermissionGuardProps) {
  const {
    cargando,
    error,
    acceso,
    tienePermiso,
  } = useAccess();

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-lg font-semibold text-blue-900">
            Verificando permisos...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 shadow">
          <h1 className="text-2xl font-bold text-red-800">
            No se pudo verificar el acceso
          </h1>

          <p className="mt-3 text-sm text-red-700">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!acceso?.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow">
          <h1 className="text-2xl font-bold text-amber-900">
            Usuario inactivo
          </h1>

          <p className="mt-3 text-sm text-amber-800">
            Tu acceso al sistema está desactivado. Contacta a un
            administrador.
          </p>
        </div>
      </main>
    );
  }

  if (!tienePermiso(permission)) {
    return (
      <>
        {fallback ?? (
          <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white p-8 shadow">
              <h1 className="text-2xl font-bold text-slate-900">
                Acceso restringido
              </h1>

              <p className="mt-3 text-sm text-slate-600">
                No tienes permiso para abrir esta sección.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Permiso requerido: {permission}
              </p>
            </div>
          </main>
        )}
      </>
    );
  }

  return <>{children}</>;
}