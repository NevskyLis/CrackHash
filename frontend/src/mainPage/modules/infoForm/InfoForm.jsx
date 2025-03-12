import "./styles.css";
import React, { useState } from "react";

// export const InfoForm = () => {
//   const [hash, setHash] = useState("");
//   const [maxLength, setMaxLength] = useState(4);
//   const [message, setMessage] = useState("");

//   const handleCrackHash = async () => {
//     try {
//       const response = await fetch("http://localhost:3000/api/hash/crack", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ hash, maxLength }),
//       });

//       const data = await response.json();
//       setMessage(`Request ID: ${data.requestId}`);
//       setCurrentRequestId(data.requestId); // Обновляем текущий requestId
//     } catch (error) {
//       console.error("Error:", error);
//       setMessage("Failed to send request");
//     }
//   };

export const InfoForm = ({ setCurrentRequestId }) => {
    const [hash, setHash] = useState("");
    const [maxLength, setMaxLength] = useState('');
    const handleCrackHash = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/hash/crack", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hash, maxLength }),
        });
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

export default InfoForm;

// function App() {
//   const [hash, setHash] = useState("");
//   const [maxLength, setMaxLength] = useState(4);
//   const [requestId, setRequestId] = useState(null);
//   const [status, setStatus] = useState(null);
//   const [result, setResult] = useState(null);

//   const handleCrackHash = async () => {
//     try {
//       const response = await fetch("http://localhost:3000/api/hash/crack", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ hash, maxLength }),
//       });
//       const data = await response.json();
//       setRequestId(data.requestId);
//       setStatus("IN_PROGRESS");
//       setResult(null);
//       checkStatus(data.requestId);
//     } catch (error) {
//       console.error("Error:", error);
//     }
//   };

//   const checkStatus = async (requestId) => {
//     try {
//       const response = await fetch(
//         `http://localhost:3000/api/hash/status?requestId=${requestId}`
//       );
//       const data = await response.json();
//       setStatus(data.status);
//       if (data.status === "READY") {
//         setResult(data.data);
//       } else if (data.status === "IN_PROGRESS") {
//         setTimeout(() => checkStatus(requestId), 1000); // Проверяем статус каждую секунду
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     }
//   };

//   return (
//     <div className="App">
//       <h1>CrackHash System</h1>
//       <div>
//         <label>
//           Hash:
//           <input
//             type="text"
//             value={hash}
//             onChange={(e) => setHash(e.target.value)}
//           />
//         </label>
//       </div>
//       <div>
//         <label>
//           Max Length:
//           <input
//             type="number"
//             value={maxLength}
//             onChange={(e) => setMaxLength(parseInt(e.target.value))}
//           />
//         </label>
//       </div>
//       <button onClick={handleCrackHash}>Crack Hash</button>

//       {status && (
//         <div>
//           <h2>Status: {status}</h2>
//           {result && (
//             <div>
//               <h3>Result:</h3>
//               <ul>
//                 {result.map((word, index) => (
//                   <li key={index}>{word}</li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
