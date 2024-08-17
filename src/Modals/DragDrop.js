import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import "./dragdrop.css";

const DragDrop = ({ onFilesAdded }) => {
  const [filesUploaded, setFilesUploaded] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      onFilesAdded(acceptedFiles);
      console.log(acceptedFiles);
      setFilesUploaded(true);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here...</p>
      ) : filesUploaded ? (
        <p className="upload-success">✔ File Uploaded Successfully</p>
      ) : (
        <p>Upload Course Syllabus (Allowed Files: png or pdf)</p> 
      )}
    </div>
  );
};

export default DragDrop;
