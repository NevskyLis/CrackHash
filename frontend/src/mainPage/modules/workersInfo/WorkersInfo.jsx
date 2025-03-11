import "./styles.css";

export const WorkersInfo = () => {
  return (
    <div className="WorkersInfoContainer">
      <p> CURRENT WORKERS </p>
      <table class="customTable">
        <thead>
          <tr>
            <th>NUMBER</th>
            <th>STATUS</th>
            <th>PERCENT</th>
            <th>DATA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Данные 1</td>
            <td>Данные 2</td>
            <td>Данные 3</td>
            <td>Данные 4</td>
          </tr>
          <tr>
            <td>Данные 5</td>
            <td>Данные 6</td>
            <td>Данные 7</td>
            <td>Данные 8</td>
          </tr>
          <tr>
            <td>Данные 9</td>
            <td>Данные 10</td>
            <td>Данные 11</td>
            <td>Данные 12</td>
          </tr>

        </tbody>
      </table>
    </div>
  );
};

export default WorkersInfo;