"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type EstadoCliente = "active" | "inactive" | "blocked";

type Cliente = {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  phone_primary: string;
  status: EstadoCliente;
};

type FormularioCliente = {
  first_name: string;
  last_name: string;
  document_number: string;
  phone_primary: string;
};

const formularioInicial: FormularioCliente = {
  first_name: "",
  last_name: "",
  document_number: "",
  phone_primary: "",
};

export default function ClientesPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial);

  const cargarClientes = useCallback(async function cargarClientesDesdeSupabase() {
    setCargando(true);
    setMensaje("");

    const resultado = await supabase
      .from("clients")
      .select(
        "id, first_name, last_name, document_number, phone_primary, status",
      )
      .order("created_at", { ascending: false });

    if (resultado.error) {
      setMensaje(
        "No se pudieron cargar los clientes: " + resultado.error.message,
      );
      setClientes([]);
    } else {
      setClientes((resultado.data || []) as Cliente[]);
    }

    setCargando(false);
  }, [supabase]);

  useEffect(
    function cargarAlAbrirPagina() {
      void cargarClientes();
    },
    [cargarClientes],
  );

  async function guardarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setMensaje("");

    const nuevoCliente = {
      first_name: formulario.first_name.trim(),
      last_name: formulario.last_name.trim(),
      document_type: "cedula",
      document_number: formulario.document_number.trim(),
      phone_primary: formulario.phone_primary.trim(),
      status: "active",
      risk_level: "unrated",
    };

    const resultado = await supabase.from("clients").insert(nuevoCliente);

    if (resultado.error) {
      setMensaje(
        "No se pudo guardar el cliente: " + resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    setFormulario(formularioInicial);
    setModalAbierto(false);
    await cargarClientes();
    setGuardando(false);
  }

  const clientesFiltrados = useMemo(
    function filtrarClientes() {
      const termino = busqueda.trim().toLowerCase();

      if (termino === "") {
        return clientes;
      }

      return clientes.filter(function coincideConBusqueda(cliente) {
        const nombreCompleto = (
          cliente.first_name +
          " " +
          cliente.last_name
        ).toLowerCase();

        return (
          nombreCompleto.includes(termino) ||
          cliente.document_number.toLowerCase().includes(termino) ||
          cliente.phone_primary.toLowerCase().includes(termino) ||
          cliente.status.toLowerCase().includes(termino)
        );
      });
    },
    [busqueda, clientes],
  );

  function obtenerTextoEstado(estado: EstadoCliente) {
    if (estado === "active") {
      return "Activo";
    }

    if (estado === "inactive") {
      return "Inactivo";
    }

    return "Bloqueado";
  }

  function obtenerClaseEstado(estado: EstadoCliente) {
    const claseBase =
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ";

    if (estado === "active") {
      return claseBase + "bg-green-100 text-green-800";
    }

    if (estado === "blocked") {
      return claseBase + "bg-red-100 text-red-800";
    }

    return claseBase + "bg-gray-100 text-gray-700";
  }

  function abrirModal() {
    setMensaje("");
    setFormulario(formularioInicial);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (!guardando) {
      setModalAbierto(false);
      setFormulario(formularioInicial);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Clientes
            </h1>

            <p className="mt-2 text-gray-600">
              Administra la información de tus clientes
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white transition hover:bg-blue-800"
          >
            Nuevo cliente
          </button>
        </div>

        {mensaje !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensaje}
          </div>
        )}

        <div className="mt-8">
          <label
            htmlFor="buscar-cliente"
            className="sr-only"
          >
            Buscar cliente
          </label>

          <input
            id="buscar-cliente"
            type="search"
            value={busqueda}
            onChange={function actualizarBusqueda(event) {
              setBusqueda(event.target.value);
            }}
            placeholder="Buscar por nombre, documento o teléfono..."
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Nombre
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Documento
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Teléfono
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Estado
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map(function mostrarCliente(cliente) {
                    return (
                      <tr
                        key={cliente.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {cliente.first_name} {cliente.last_name}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {cliente.document_number}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {cliente.phone_primary}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={obtenerClaseEstado(cliente.status)}
                          >
                            {obtenerTextoEstado(cliente.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            type="button"
                            className="font-medium text-blue-900 hover:text-blue-700"
                          >
                            Ver
                          </button>

                          <span className="mx-2 text-gray-300">
                            |
                          </span>

                          <button
                            type="button"
                            className="font-medium text-blue-900 hover:text-blue-700"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-900">
                Nuevo cliente
              </h2>

              <button
                type="button"
                onClick={cerrarModal}
                className="text-2xl text-gray-500 hover:text-gray-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarCliente}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nombres
                </label>

                <input
                  id="first_name"
                  type="text"
                  value={formulario.first_name}
                  onChange={function actualizarNombres(event) {
                    setFormulario({
                      ...formulario,
                      first_name: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Apellidos
                </label>

                <input
                  id="last_name"
                  type="text"
                  value={formulario.last_name}
                  onChange={function actualizarApellidos(event) {
                    setFormulario({
                      ...formulario,
                      last_name: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="document_number"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cédula o documento
                </label>

                <input
                  id="document_number"
                  type="text"
                  value={formulario.document_number}
                  onChange={function actualizarDocumento(event) {
                    setFormulario({
                      ...formulario,
                      document_number: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="phone_primary"
                  className="block text-sm font-medium text-gray-700"
                >
                  Teléfono
                </label>

                <input
                  id="phone_primary"
                  type="tel"
                  value={formulario.phone_primary}
                  onChange={function actualizarTelefono(event) {
                    setFormulario({
                      ...formulario,
                      phone_primary: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}