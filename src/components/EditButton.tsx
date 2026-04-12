import React from "react";

interface EditButtonProps {
  isEditing: boolean;
  onToggleEdit: () => void;
}

const EditButton: React.FC<EditButtonProps> = ({ isEditing, onToggleEdit }) => {
  return (
    <div className="flex justify-end">
      <button
        onClick={onToggleEdit}
        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition duration-300 hover:bg-blue-700"
      >
        {isEditing ? "取消编辑" : "编辑资料"}
      </button>
    </div>
  );
};

export default EditButton;
