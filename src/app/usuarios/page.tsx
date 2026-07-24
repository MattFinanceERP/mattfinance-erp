"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "../components/PermissionGuard";
import { useAccess } from "../components/AccessProvider";
import { createClient } from "../lib/supabase";

type UsuarioSistema = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role_id: string | null;
  role_name: string | null;
  role_display_name: string | null;
};

type RolSistema = {
  role_id: string;
  role_name: string;
  display_name: string;
  description: string | null;
};

type FormularioUsuario = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  role_id: string;
  is_active: boolean;
};

const formularioInicial: FormularioUsuario = {
  user_id: "",
  email: "",
  full_name: "",
  phone: "",
  role_id: "",
  is_active: true,
};

export default function UsuariosPage() {
  return (
    <PermissionGuard permission="users.view">
      <UsuariosContent />
    </PermissionGuard>
  );
}

function UsuariosContent() {
  const supabase = useMemo(() => createClient(), []);
  const { tienePermiso } = useAccess();
  const puedeAdministrar = tienePermiso("users.manage");

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [roles, setRoles] = useState<RolSistema[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    const [usuariosResultado, rolesResultado] = await Promise.all([
      supabase.rpc("get_system_users"),
      supabase.rpc("get_active_roles"),
    ]);

    if (usuariosResultado.error) {
      setError(
        "No se pudieron cargar los usuarios: " +
          usuariosResultado.error.message,
      );
      setUsuarios([]);
    } else {
      setUsuarios(
        ((usuariosResultado.data || []) as UsuarioSistema[]).map(
          (usuario) => ({
            ...usuario,
            is_active: Boolean(usuario.is_active),
          }),
        ),
      );
    }

    if (rolesResultado.error) {
      setError(
        "No se pudieron cargar los roles: " +
          rolesResultado.error.message,
      );
      setRoles([]);
    } else {
      setRoles((rolesResultado.data || []) as RolSistema[]);
    }

    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideBusqueda =
        termino === "" ||
        [
          usuario.full_name,
          usuario.email,
          usuario.phone || "",
          usuario.role_display_name || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(termino);

      const coincideRol =
        filtroRol === "all" || usuario.role_name === filtroRol;

      const coincideEstado =
        filtroEstado === "all" ||
        (filtroEstado === "active" && usuario.is_active) ||
        (filtroEstado === "inactive" && !usuario.is_active);

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [busqueda, filtroEstado, filtroRol, usuarios]);

  const resumen = useMemo(
    () => ({
      total: usuarios.length,
      activos: usuarios.filter((usuario) => usuario.is_active).length,
      inactivos: usuarios.filter((usuario) => !usuario.is_active).length,
      administradores: usuarios.filter(
        (usuario) => usuario.role_name === "administrator",
      ).length,
    }),
    [usuarios],
  );

  function abrirEdicion(usuario: UsuarioSistema) {
    if (!puedeAdministrar) {
      setError("No tienes permiso para administrar usuarios.");
      return;
    }

    setFormulario({
      user_id: usuario.user_id,
      email: usuario.email,
      full_name: usuario.full_name,
      phone: usuario.phone || "",
      role_id: usuario.role_id || "",
      is_active: usuario.is_active,
    });
    setError("");
    setExito("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
    setFormulario(formularioInicial);
  }

  function actualizarFormulario(
    campo: keyof FormularioUsuario,
    valor: string | boolean,
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarUsuario() {
    if (!puedeAdministrar) {
      setError("No tienes permiso para guardar cambios de usuarios.");
      cerrarModal();
      return;
    }

    if (formulario.user_id === "") {
      setError("No se recibió el usuario seleccionado.");
      return;
    }

    if (formulario.full_name.trim() === "") {
      setError("Debes indicar el nombre completo.");
      return;
    }

    if (formulario.role_id === "") {
      setError("Debes seleccionar un rol.");
      return;
    }

    const usuarioActual = usuarios.find(
      (usuario) => usuario.user_id === formulario.user_id,
    );

    const desactivando =
      usuarioActual?.is_active === true &&
      formulario.is_active === false;

    if (desactivando) {
      const confirmar = window.confirm(
        "¿Confirmas que deseas desactivar el acceso de este usuario?",
      );

      if (!confirmar) return;
    }

    setGuardando(true);
    setError("");
    setExito("");

    const resultado = await supabase.rpc("manage_system_user", {
      p_user_id: formulario.user_id,
      p_full_name: formulario.full_name.trim(),
      p_phone: formulario.phone.trim() || null,
      p_role_id: formulario.role_id,
      p_is_active: formulario.is_active,
    });

    if (resultado.error) {
      setError(
        "No se pudo actualizar el usuario: " +
          resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    setExito("Usuario actualizado correctamente.");
    setGuardando(false);
    cerrarModal();
    await cargarDatos();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Usuarios
            </h1>
            <p className="mt-2 text-gray-600">
              Administra nombres, roles y accesos de MattFinance ERP.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void cargarDatos()}
            className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {exito && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {exito}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Resumen titulo="Total" valor={resumen.total} />
          <Resumen titulo="Activos" valor={resumen.activos} />
          <Resumen titulo="Inactivos" valor={resumen.inactivos} />
          <Resumen
            titulo="Administradores"
            valor={resumen.administradores}
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Buscar y filtrar
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              className="rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
            />

            <select
              value={filtroRol}
              onChange={(event) => setFiltroRol(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.role_id} value={rol.role_name}>
                  {rol.display_name}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Usuario",
                    "Correo",
                    "Teléfono",
                    "Rol",
                    "Estado",
                    "Último acceso",
                    "Acción",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.user_id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {usuario.full_name}
                        </p>
                        <p className="mt-1 max-w-xs break-all text-xs text-gray-500">
                          {usuario.user_id}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {usuario.email}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {usuario.phone || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          {usuario.role_display_name ||
                            "Sin perfil asignado"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            usuario.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"
                              : "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800"
                          }
                        >
                          {usuario.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {usuario.last_login_at
                          ? formatearFechaHora(usuario.last_login_at)
                          : "Sin registro"}
                      </td>

                      <td className="px-4 py-4">
                        {puedeAdministrar ? (
                          <button
                            type="button"
                            onClick={() => abrirEdicion(usuario)}
                            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Administrar
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Solo lectura
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalAbierto && puedeAdministrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Administrar usuario
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {formulario.email}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Campo
                etiqueta="Nombre completo"
                valor={formulario.full_name}
                cambiar={(valor) =>
                  actualizarFormulario("full_name", valor)
                }
              />

              <Campo
                etiqueta="Teléfono"
                valor={formulario.phone}
                cambiar={(valor) =>
                  actualizarFormulario("phone", valor)
                }
                placeholder="Opcional"
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Rol
                </label>
                <select
                  value={formulario.role_id}
                  onChange={(event) =>
                    actualizarFormulario(
                      "role_id",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3"
                >
                  <option value="">Selecciona un rol</option>
                  {roles.map((rol) => (
                    <option key={rol.role_id} value={rol.role_id}>
                      {rol.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Estado del acceso
                </label>

                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 p-3">
                  <input
                    type="checkbox"
                    checked={formulario.is_active}
                    onChange={(event) =>
                      actualizarFormulario(
                        "is_active",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">
                    Usuario activo y autorizado para utilizar el sistema
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
              El rol controla las acciones permitidas. Desactivar el
              usuario conserva su historial y auditoría.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void guardarUsuario()}
                disabled={guardando}
                className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-blue-900">{valor}</p>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  cambiar,
  placeholder = "",
}: {
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {etiqueta}
      </label>
      <input
        type="text"
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
