import React, { useState } from "react";
import "./styles.css";
import { InfoForm } from "./modules/infoForm/InfoForm";
import { WorkersInfo } from "./modules/workersInfo/WorkersInfo";
import { QueueInfo } from "./modules/queueInfo/QueueInfo";

export const MainPage = () => {
  const [activeRequestId, setActiveRequestId] = useState(null);

  const handleActiveRequestIdChange = (requestId) => {
    setActiveRequestId(requestId);
  };

  return (
    <div>
      <div className="Title">
        <h1>
          Hash
          <br />
          Crack
        </h1>
      </div>

      <div className="ContentContainer">
        <InfoForm />
        <div>
          <WorkersInfo activeRequestId={activeRequestId} />
          <QueueInfo onActiveRequestIdChange={handleActiveRequestIdChange} />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
