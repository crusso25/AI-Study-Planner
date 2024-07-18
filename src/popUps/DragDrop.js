import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const DragDrop = ({ onFilesAdded }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      onFilesAdded(acceptedFiles);
      console.log(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} style={styles.dropzone}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here...</p>
      ) : (
        <p>Upload Course Syllabus (Allowed Files: png or pdf)</p> 
      )}
    </div>
  );
};

const styles = {
  dropzone: {
    border: "2px dashed #cccccc",
    borderRadius: "5px",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#f9f9f9",
    transition: "background-color 0.2s ease",
    height: "200px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default DragDrop;
