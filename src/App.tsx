/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { type WebsiteListInterface, type WebsiteListWithStatusInterface } from "./data/website";
import axios from "axios";

const backend = import.meta.env.VITE_BACKEND_URL;

const StatusBadge: React.FC<{ status: boolean }> = ({ status }) => {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        status
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status ? "Online" : "Offline"}
    </span>
  );
};

function App() {
  const [table, setTable] = useState<Array<WebsiteListWithStatusInterface>>([]);
  const [serverName, setServerName] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [data, setData] = useState<Array<WebsiteListInterface>>([]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${backend}/get-data-client`);
      setData(response.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  const getStatus = async () => {
    await Promise.all(data.filter((website) => {
      if (serverName !== "ALL") {
        return website.server_location === serverName
      }
      return 1;
    }).map(async (website) => {
      const status_client = website.domain_name.length 
        ? await axios.get(`${backend}/check?url=${website.domain_name}`).then((res) => res.data.status)
        : false;
      const status_server = website.backend_url.length
        ? await axios.get(`${website.backend_url}`).then((data) => data.status).catch((_err) => null)
        : 404;

      setTable((prev) => [...prev, {
        server_location: website.server_location,
        domain_name: website.domain_name,
        program_name: website.program_name,
        status_client,
        backend_url: website.backend_url,
        status_server: status_server === 200,
      }]);
    }));
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      getStatus();
    }
  }, [data]);

  return (
    <>
      <h1 className="text-center m-3 text-5xl font-bold">Domain Checker</h1>
      <div className="w-auto m-5 p-3 rounded bg-amber-200 flex-col">
        <h4 className="font-bold mb-3">Filter :</h4>
        <div className="w-auto flex">
          <div className="w-auto flex flex-col m-2">
            <label htmlFor="Select Server" className="mb-1 font-bold">Select Server</label>
            <select value={serverName} onChange={(e) => setServerName(e.target.value)} className="bg-white rounded p-3 w-100">
              <option value="ALL">All</option>
              <option value="biznet-1">Biznet 1</option>
              <option value="biznet-2">Biznet 2</option>
              <option value="backup-server">Backup Server</option>
              <option value="nevacloud-dev">Nevacloud Dev</option>
              <option value="nevacloud-2">Nevacloud 2</option>
              <option value="nevacloud-3">Nevacloud 3</option>
            </select>
          </div>
          <div className="w-auto flex flex-col m-2">
            <label htmlFor="Select Server" className="mb-1 font-bold">Search</label>
            <input placeholder="Search" onChange={(e) => setSearch(e.target.value)} className="bg-white p-3 rounded w-100"></input>
          </div>
        </div>
        <button onClick={() => getStatus()} className="m-2 w-20 p-2 bg-white rounded">Refresh</button>
      </div>
      <div className="overflow-x-auto m-5">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
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
            .filter(site =>
              site.program_name.toLowerCase().includes(search.toLowerCase()) ||
              site.domain_name.toLowerCase().includes(search.toLowerCase()) ||
              site.server_location.toLowerCase().includes(search.toLowerCase())
            )
            .map((site, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{site.server_location}</td>
                <td className="border px-4 py-2">{site.program_name}</td>
                <td className="border px-4 py-2">{site.domain_name}</td>
                <td className="border px-4 py-2">
                  <StatusBadge status={site.status_client} />
                </td>
                <td className="border px-4 py-2">{site.backend_url.split("/api")[0]}</td>
                <td className="border px-4 py-2">
                  <StatusBadge status={site.status_server} />
                </td>
              </tr>
            ))}
        </tbody>
        </table>
      </div>
    </>
  )
}

export default App
