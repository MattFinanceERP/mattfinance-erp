"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "./supabase";

export type AccesoUsuario = {
  user_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  role_name: string;
  role_display_name: string;
  permissions: string[];
};

type EstadoAcceso = {
  acceso: AccesoUsuario | null;
  cargando: boolean;
  error: string;
};

export function useCurrentUserAccess() {
  const supabase = useMemo(() => createClient(), []);

  const [estado, setEstado] = useState<EstadoAcceso>({
    acceso: null,
    cargando: true,
    error: "",
  });

  const cargarAcceso = useCallback(async () => {
    setEstado((actual) => ({
      ...actual,
      cargando: true,
      error: "",
    }));

    const resultado = await supabase.rpc(
      "get_current_user_access",
    );

    if (resultado.error) {
      setEstado({
        acceso: null,
        cargando: false,
        error:
          "No se pudo cargar el acceso del usuario: " +
          resultado.error.message,
      });
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    if (!fila) {
      setEstado({
        acceso: null,
        cargando: false,
        error:
          "El usuario no tiene un perfil configurado.",
      });
      return;
    }

    setEstado({
      acceso: {
        user_id: String(fila.user_id),
        full_name: String(fila.full_name || "Usuario"),
        phone: fila.phone ? String(fila.phone) : null,
        is_active: Boolean(fila.is_active),
        role_name: String(fila.role_name || ""),
        role_display_name: String(
          fila.role_display_name || "",
        ),
        permissions: Array.isArray(fila.permissions)
          ? fila.permissions.map(String)
          : [],
      },
      cargando: false,
      error: "",
    });
  }, [supabase]);

  useEffect(() => {
    void cargarAcceso();
  }, [cargarAcceso]);

  function tienePermiso(codigo: string) {
    return Boolean(
      estado.acceso?.is_active &&
        estado.acceso.permissions.includes(codigo),
    );
  }

  function tieneAlguno(codigos: string[]) {
    return codigos.some((codigo) => tienePermiso(codigo));
  }

  function tieneTodos(codigos: string[]) {
    return codigos.every((codigo) => tienePermiso(codigo));
  }

  return {
    ...estado,
    tienePermiso,
    tieneAlguno,
    tieneTodos,
    recargarAcceso: cargarAcceso,
  };
}