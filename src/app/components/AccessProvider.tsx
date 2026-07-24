"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  useCurrentUserAccess,
  type AccesoUsuario,
} from "../lib/useCurrentUserAccess";

type AccessContextType = {
  acceso: AccesoUsuario | null;
  cargando: boolean;
  error: string;

  tienePermiso: (codigo: string) => boolean;
  tieneAlguno: (codigos: string[]) => boolean;
  tieneTodos: (codigos: string[]) => boolean;

  recargarAcceso: () => Promise<void>;
};

const AccessContext = createContext<AccessContextType | null>(
  null,
);

export function AccessProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    acceso,
    cargando,
    error,
    tienePermiso,
    tieneAlguno,
    tieneTodos,
    recargarAcceso,
  } = useCurrentUserAccess();

  return (
    <AccessContext.Provider
      value={{
        acceso,
        cargando,
        error,
        tienePermiso,
        tieneAlguno,
        tieneTodos,
        recargarAcceso,
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const contexto = useContext(AccessContext);

  if (!contexto) {
    throw new Error(
      "useAccess debe utilizarse dentro de AccessProvider.",
    );
  }

  return contexto;
}