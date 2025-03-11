import "./styles.css";

export const InfoForm = () => {
  return (
    <div className="InfoFormContainer">
      <div className="InfoFormItem">
        <p> HASH </p>
        <input
          type="text"
        />
      </div>
      <div className="InfoFormItem">
        <p> max Length </p>
        <input
          type="number"
        />
      </div>
      <button className="customButton" onClick={() => {}}>
        SEND
      </button>
    </div>
  );
};

export default InfoForm;