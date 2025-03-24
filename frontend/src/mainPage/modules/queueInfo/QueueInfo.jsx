import React, { useEffect, useState } from "react";
import "../workersInfo/styles.css";

export const QueueInfo = ({ onActiveRequestIdChange }) => {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource(
      "http://localhost:3000/api/queue/info/sse"
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setQueue(data);

      const activeTask = data.find((task) => task.status === "IN_PROGRESS");
      if (activeTask) {
        onActiveRequestIdChange(activeTask.requestId);
      } else {
        onActiveRequestIdChange(null);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [onActiveRequestIdChange]);

  return (
    <div className="workersInfoContainer">
      <p> CURRENT QUEUE </p>
      <table className="customTable">
        <thead>
          <tr>
            <th>REQUEST ID</th>
            <th>STATUS</th>
            <th>ANSWER</th>
            <th style={{ width: "200px" }}>PROGRESS</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item, index) => (
            <tr key={index}>
              <td>{item.requestId}</td>
              <td>{item.status}</td>
              <td>{item.result.join(", ")}</td>
              <td style={{ width: "200px" }}>
                <progress
                  value={item.progress || 0}
                  max="100"
                  className="progressBar"
                ></progress>
                {item.progress ? ` ${item.progress.toFixed(2)}%` : " 0%"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueueInfo;
