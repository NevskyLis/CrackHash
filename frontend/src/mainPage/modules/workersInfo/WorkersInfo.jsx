import React, { useEffect, useState } from "react";
import "./styles.css";

export const WorkersInfo = ({ requestId }) => {
  const [workers, setWorkers] = useState([]);

  const fetchWorkersInfo = async () => {
    try {
      if (requestId) {
        const response = await fetch(
          `http://localhost:3000/api/workers/info?requestId=${requestId}`
        );
        const data = await response.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error("Error fetching workers info:", error);
    }
  };

  useEffect(() => {
    fetchWorkersInfo();
    const interval = setInterval(fetchWorkersInfo, 1000);
    return () => clearInterval(interval);
  }, [requestId]);

  return (
    <div className="WorkersInfoContainer">
      <p> CURRENT WORKERS </p>
      <table className="customTable">
        <thead>
          <tr>
            <th>NUMBER</th>
            <th>STATUS</th>
            <th>ANSWER</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((worker, index) => (
            <tr key={index}>
              <td>{worker.number}</td>
              <td>{worker.status}</td>
              <td>{worker.data.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkersInfo;
