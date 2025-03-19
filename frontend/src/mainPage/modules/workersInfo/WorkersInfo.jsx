import React, { useEffect, useState } from "react";
import "./styles.css";

export const WorkersInfo = ({ activeRequestId }) => {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    if (!activeRequestId) return; 
    const workersEventSource = new EventSource(
      `http://localhost:3000/api/workers/info/sse?requestId=${activeRequestId}`
    );

    workersEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWorkers(data);
    };

    workersEventSource.onerror = () => {
      console.error("SSE connection error (workers)");
      workersEventSource.close();
    };

    return () => {
      workersEventSource.close();
    };
  }, [activeRequestId]); 

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
