import React, { useEffect, useState } from "react";
import "../workersInfo/styles.css";


export const QueueInfo = () => {
  const [queue, setQueue] = useState([]);

  const fetchQueueInfo = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/queue/info");
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching queue info:", error);
    }
  };

  useEffect(() => {
    fetchQueueInfo();

    const intervalId = setInterval(fetchQueueInfo, 5000); 

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="WorkersInfoContainer">
      <p> CURRENT QUEUE </p>
      <table className="customTable">
        <thead>
          <tr>
            <th>REQUEST ID</th>
            <th>STATUS</th>
            <th>ANSWER</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item, index) => (
            <tr key={index}>
              <td>{item.requestId}</td>
              <td>{item.status}</td>
              <td>{item.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueueInfo;
