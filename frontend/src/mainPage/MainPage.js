import React, { useState } from "react";
import "./styles.css";
import { InfoForm } from "./modules/infoForm/InfoForm";
import { WorkersInfo } from "./modules/workersInfo/WorkersInfo";
import { QueueInfo } from "./modules/queueInfo/QueueInfo";

export const MainPage = () => {
  const [currentRequestId, setCurrentRequestId] = useState(null);

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
          <WorkersInfo requestId={currentRequestId} />
          <QueueInfo />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
