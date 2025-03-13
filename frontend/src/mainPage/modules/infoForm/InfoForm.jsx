import React, { useEffect, useState } from "react";
import "./styles.css";

export const InfoForm = ({ setCurrentRequestId }) => {
  const [hash, setHash] = useState("");
  const [maxLength, setMaxLength] = useState("");

  const handleCrackHash = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/hash/crack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hash, maxLength }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData);
      }

      const data = await response.json();
      setCurrentRequestId(data.requestId);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="InfoFormContainer">
      <div className="InfoFormItem">
        <p> HASH </p>
        <input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
        />
      </div>
      <div className="InfoFormItem">
        <p> max Length </p>
        <input
          type="number"
          value={maxLength}
          onChange={(e) => setMaxLength(parseInt(e.target.value))}
        />
      </div>
      <button className="customButton" onClick={handleCrackHash}>
        SEND
      </button>
    </div>
  );
};
