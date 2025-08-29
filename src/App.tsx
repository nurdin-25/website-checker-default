/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  type WebsiteListInterface,
  type WebsiteListWithStatusInterface,
} from "./data/website";

const backend = import.meta.env.VITE_BACKEND_URL;

interface ResponseFetch {
  data:{
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    items: WebsiteListInterface[],
  }
}

// === Badge 3 warna (client) ===
const ClientBadge: React.FC<{ mode: boolean }> = ({ mode }) => {
  const m =
    mode
      ? { cls: "bg-green-100 text-green-700", label: "Online" }
      : mode
        ? { cls: "bg-amber-100 text-amber-700", label: "Online – Protected" }
        : { cls: "bg-red-100 text-red-700", label: "Offline" };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
};

// === Badge 2 warna (server/origin) ===
const ServerBadge: React.FC<{ status: boolean }> = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${
      status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
  >
    {status ? "Online" : "Offline"}
  </span>
);

// ---- Helpers ----

// Klasifikasi status client dari response /check
function classifyClient(res?: { status: number; data?: any }, err?: any):
  { bool: boolean; mode: "online" | "protected" | "offline" } {

  // Cek response/data lebih detail
  const extract = (x: any) => {
    if (!x) return undefined;
    if (typeof x === "object" && x.status) {
      if (typeof x.status === "boolean") return x.status ? "ONLINE" : "OFFLINE";
      if (typeof x.status === "string") return x.status.toUpperCase();
    }
    if (typeof x === "string") return x.toUpperCase();
    return undefined;
  };

  const val =
    extract(res?.data) ??
    extract(res) ??
    extract(err?.response?.data) ??
    extract(err?.response);

  if (val === "ONLINE") return { bool: true, mode: "online" };
  if (val === "ONLINE_PROTECTED" || val === "PROTECTED") return { bool: true, mode: "protected" };
  if (val === "OFFLINE") return { bool: false, mode: "offline" };

  // fallback berdasarkan HTTP code dari /check
  const code = res?.status ?? err?.response?.status ?? 0;
  if (code === 403 || code === 503) return { bool: true, mode: "protected" };
  if (code >= 100 && code <= 599) return { bool: true, mode: "online" };
  return { bool: false, mode: "offline" };
}

// Klasifikasi server/origin (anggap online jika ada respon HTTP apapun)
function isServerOnlineFromAxiosResponse(r?: { status?: number }) {
  return typeof r?.status === "number" && r.status >= 200 && r.status < 500;
}

function App() {
  const [table, setTable] = useState<Array<WebsiteListWithStatusInterface>>([]);
  const [data, setData] = useState<Array<WebsiteListInterface>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const tableRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);

  const fetchData = async () => {
    try {
      const response = await axios.get<ResponseFetch>(`${backend}/get-data-client?page=${page}&limit=${limit}`, { validateStatus: () => true });
      setData(response.data.data.items || []);
    } catch {
      setData([]);
    }
  };

  const getStatus = async () => {
    setLoading(true);

    for (const website of data) {
      if (stopRef.current) break;
      // --- Client status via /check ---
      let client: { bool: boolean; mode: "online" | "protected" | "offline" } = { bool: false, mode: "offline" };
      if (website.domain_name?.length) {
        try {
          const res = await axios.get(`${backend}/check`, {
            params: { url: website.domain_name },
            timeout: 12000,
            validateStatus: () => true,
          });
          client = classifyClient({ status: res.status, data: res.data });
        } catch (err: any) {
          client = classifyClient(undefined, err);
        }
      }

      // --- Server/origin status ---
      let serverOnline = false;
      if (website.backend_url?.length) {
        try {
          const head = await axios.head(website.backend_url, {
            timeout: 8000,
            validateStatus: () => true,
          });
          serverOnline = isServerOnlineFromAxiosResponse(head);

          if (!serverOnline) {
            const get = await axios.get(website.backend_url, {
              timeout: 10000,
              validateStatus: () => true,
            });
            serverOnline = isServerOnlineFromAxiosResponse(get);
          }
        } catch {
          serverOnline = false;
        }
      }
      if (!website.backend_url) serverOnline = false;

      const row: WebsiteListWithStatusInterface = {
        server_location: website.server_location,
        domain_name: website.domain_name,
        program_name: website.program_name,
        status_client: client.bool,
        backend_url: website.backend_url,
        status_server: serverOnline,
      };

      setTable((prev) => [...prev, row]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length) {
      getStatus();
    }
  }, [table]);

  return (
    <>
      <h1 className="text-center m-3 text-5xl font-bold">Domain Checker</h1>
      <div className="w-auto m-5 p-3 rounded bg-amber-200 flex-col">
        <h4 className="font-bold mb-3">Filter :</h4>
        <div className="w-auto flex flex-wrap gap-4">
          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Select Server</label>
            <select
              className="bg-white rounded p-3 w-56"
            >
              <option value="ALL">All</option>
              <option value="biznet-1">Biznet 1</option>
              <option value="biznet-2">Biznet 2</option>
              <option value="backup-server">Backup Server</option>
              <option value="nevacloud-dev">Nevacloud Dev</option>
              <option value="nevacloud-2">Nevacloud 2</option>
              <option value="nevacloud-3">Nevacloud 3</option>
            </select>
          </div>

          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Search</label>
            <input
              placeholder="Search"
              className="bg-white p-3 rounded w-80"
            />
          </div>

          <div className="flex items-end gap-2">
            <button disabled={loading} className="m-0 p-3 bg-white rounded border">
              {loading ? "Checking..." : "Cari"}
            </button>
            <button className="m-0 p-3 bg-white rounded border text-red-600">
              Stop
            </button>
          </div>
        </div>
      </div>

      {table.length > 0 && (
        <>
          <div className="mb-2 ml-5 font-bold">Total Toko: {table.length}</div>
          <div ref={tableRef} className="overflow-x-auto m-5" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <table className="min-w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left">No</th>
                  <th className="border px-4 py-2 text-left">Server Location</th>
                  <th className="border px-4 py-2 text-left">Program Name</th>
                  <th className="border px-4 py-2 text-left">Domain Name</th>
                  <th className="border px-4 py-2 text-left">Client Status</th>
                  <th className="border px-4 py-2 text-left">Backend URL</th>
                  <th className="border px-4 py-2 text-left">Server Status</th>
                </tr>
              </thead>
              <tbody>
                {table
                  .map((site, index) => {
                    return (
                      <tr key={`${site.program_name}-${index}`} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{site.server_location}</td>
                        <td className="border px-4 py-2">{site.program_name}</td>
                        <td className="border px-4 py-2">{site.domain_name}</td>
                        <td className="border px-4 py-2"><ClientBadge mode={site.status_client} /></td>
                        <td className="border px-4 py-2">{site.backend_url?.split("/api")[0] || "-"}</td>
                        <td className="border px-4 py-2"><ServerBadge status={site.status_server} /></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {/* Pagination controls */}
            <div className="flex justify-center items-center gap-2 my-2">
              <button className="px-3 py-1 bg-gray-200 rounded">Prev</button>
              <span>Page {page}</span>
              <button className="px-3 py-1 bg-gray-200 rounded">Next</button>
            </div>

            {table.length === 0 && !loading && (
              <div className="text-center text-gray-500 p-6">Tidak ada data.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default App;
