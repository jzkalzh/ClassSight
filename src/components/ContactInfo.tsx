import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";

interface ContactInfoProps {
  email: string;
  phone: string;
  office: string;
}

const ContactInfo: React.FC<ContactInfoProps> = ({ email, phone, office }) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-[oklch(0.205_0_0)]">
      <h3 className="mb-4 text-lg font-semibold">联系方式</h3>
      <div className="space-y-3">
        <div className="flex items-center">
          <Mail className="mr-3 h-5 w-5 text-gray-400" />
          <span>{email || "未设置邮箱"}</span>
        </div>
        <div className="flex items-center">
          <Phone className="mr-3 h-5 w-5 text-gray-400" />
          <span>{phone || "未设置电话"}</span>
        </div>
        <div className="flex items-center">
          <MapPin className="mr-3 h-5 w-5 text-gray-400" />
          <span>{office || "未设置办公室"}</span>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
