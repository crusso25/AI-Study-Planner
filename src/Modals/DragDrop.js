import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import "./dragdrop.css";

const DragDrop = ({ onFilesAdded, resetFilesUploaded }) => {
  const [filesUploaded, setFilesUploaded] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      onFilesAdded(acceptedFiles);
      console.log(acceptedFiles);
      setFilesUploaded(true);
    },
    [onFilesAdded]
  );

  useEffect(() => {
    setFilesUploaded(false);
  }, [resetFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here...</p>
      ) : filesUploaded ? (
        <p className="upload-success">✔ File Uploaded Successfully</p>
      ) : (
        <p>Upload Course Syllabus File (PDF or PNG)</p> 
      )}
    </div>
  );
};

export default DragDrop;
