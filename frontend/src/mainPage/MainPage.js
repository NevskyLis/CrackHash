import React, { useState, useEffect } from "react";
import "./styles.css";
import { InfoForm } from "./modules/infoForm/InfoForm";
import { WorkersInfo } from "./modules/workersInfo/WorkersInfo";
import { QueueInfo } from "./modules/queueInfo/QueueInfo";

export const MainPage = () => {
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);

  const updateActiveRequestId = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/queue/info");
      const data = await response.json();

      const activeTask = data.find((task) => task.status === "IN_PROGRESS");
      if (activeTask) {
        setActiveRequestId(activeTask.requestId);
      } else {
        setActiveRequestId(null); 
      }
    } catch (error) {
      console.error("Error fetching queue info:", error);
    }
  };

  useEffect(() => {
    updateActiveRequestId();
    const intervalId = setInterval(updateActiveRequestId, 10000); 
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <div className="Title">
        <h1>
          {" "}
          Hash
          <br />
          Crack{" "}
        </h1>
      </div>

      <div className="ContentContainer">
        <InfoForm setCurrentRequestId={setCurrentRequestId} />
        <div>
          <WorkersInfo requestId={activeRequestId} />
          <QueueInfo />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
