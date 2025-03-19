import React, { useEffect, useState } from "react";
import "../workersInfo/styles.css";

export const QueueInfo = ({ onActiveRequestIdChange }) => {
  const [queue, setQueue] = useState([]);
  const [progress, setProgress] = useState({});

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

    return () => {
      eventSource.close();
    };
  }, [onActiveRequestIdChange]);

  useEffect(() => {
    const progressEventSources = {};

    queue.forEach((item) => {
      const { requestId } = item;

      if (!progressEventSources[requestId]) {
        progressEventSources[requestId] = new EventSource(
          `http://localhost:3000/api/hash/progress/sse?requestId=${requestId}`
        );

        progressEventSources[requestId].onmessage = (event) => {
          const data = JSON.parse(event.data);
          setProgress((prevProgress) => ({
            ...prevProgress,
            [data.requestId]: data.progress,
          }));
        };

        progressEventSources[requestId].onerror = () => {
          console.error(
            `SSE progress connection error for requestId: ${requestId}`
          );
          progressEventSources[requestId].close();
        };
      }
    });

    return () => {
      Object.values(progressEventSources).forEach((eventSource) => {
        eventSource.close();
      });
    };
  }, [queue]);

  const ProgressBar = ({ progress }) => {
    return (
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        <div className="progress-text">{progress}%</div>
      </div>
    );
  };

  return (
    <div className="WorkersInfoContainer">
      <p> CURRENT QUEUE </p>
      <table className="customTable">
        <thead>
          <tr>
            <th>REQUEST ID</th>
            <th>STATUS</th>
            <th>ANSWER</th>
            <th>PROGRESS</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item, index) => (
            <tr key={index}>
              <td>{item.requestId}</td>
              <td>{item.status}</td>
              <td>{item.result}</td>
              <td>
                <ProgressBar progress={progress[item.requestId] || 0} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueueInfo;
