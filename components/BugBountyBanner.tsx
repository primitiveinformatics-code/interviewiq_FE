"use client";
import { useEffect, useState } from "react";
import { getContactInfo } from "@/lib/api";
import { CONTACT } from "@/lib/contact";

export default function BugBountyBanner() {
  const [bannerMsg, setBannerMsg] = useState("Found a bug in production? Report it and earn interview credits!");
  const [popupDetails, setPopupDetails] = useState(
    "Send details of the bug to our contact email ID. Credits are subject to terms and conditions and are at the sole discretion of the admin."
  );
  const [contactEmail, setContactEmail] = useState(CONTACT.email);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getContactInfo()
      .then((info) => {
        setBannerMsg(info.banner_message);
        setPopupDetails(info.banner_popup_details);
        setContactEmail(info.email);
      })
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <>
      {/* Banner bar */}
      <div className="bg-amber-400 text-amber-900 text-sm font-medium px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
        <span>{bannerMsg}</span>
        <button
          onClick={() => setShowModal(true)}
          className="underline font-semibold hover:text-amber-700 transition whitespace-nowrap"
        >
          Click here
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Report a Production Bug</h2>
            <p className="text-gray-600 text-sm mb-3">{popupDetails}</p>
            <p className="text-gray-600 text-sm">
              Send bug details to:{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-indigo-600 font-semibold hover:underline"
              >
                contact email ID
              </a>
            </p>
            <p className="text-xs text-gray-400 mt-4 italic">
              Credits are subject to terms and conditions and are at the sole discretion of the admin.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
