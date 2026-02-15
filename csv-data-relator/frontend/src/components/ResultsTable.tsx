interface ResultsTableProps {
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
}

export const ResultsTable = ({ headers, rows }: ResultsTableProps) => {
  return (
    <section className="card">
      <h2>Merged Output Preview</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${String(row[headers[0]] ?? "")}`}>
                {headers.map((header) => (
                  <td key={`${index}-${header}`}>{row[header] === null ? "" : String(row[header])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
