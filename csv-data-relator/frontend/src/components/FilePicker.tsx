interface FilePickerProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (name: string) => void;
}

const toFileArray = (list: FileList | null): File[] => {
  if (!list) {
    return [];
  }
  return Array.from(list).filter((file) => file.name.toLowerCase().endsWith(".csv"));
};

export const FilePicker = ({ files, onFilesSelected, onRemoveFile }: FilePickerProps) => {
  return (
    <section className="card">
      <label className="dropzone" htmlFor="csv-files">
        <input
          id="csv-files"
          type="file"
          accept=".csv"
          multiple
          onChange={(event) => onFilesSelected(toFileArray(event.target.files))}
        />
        <p className="dropzone-title">Drop CSV files here or click to browse</p>
        <p className="dropzone-subtitle">
          Every file should include an Employee ID column. Other columns can vary.
        </p>
      </label>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.name} className="file-item">
              <span>{file.name}</span>
              <button type="button" onClick={() => onRemoveFile(file.name)} className="link-btn">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
