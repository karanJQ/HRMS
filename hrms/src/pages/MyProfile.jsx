import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Loader from '../components/common/Loader';
import ErrorMsg from '../components/common/ErrorMsg';
import Badge from '../components/common/Badge';
import { empAPI } from '../api/endpoints';
import { User, Mail, Phone, Calendar, Landmark, MapPin, Award, FileText } from 'lucide-react';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = () => {
    setLoading(true);
    setError(null);
    empAPI.me()
      .then(res => {
        setProfile(res.data.data);
      })
      .catch(err => {
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <Layout title="My Profile" theme="light">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="My Profile" theme="light">
        <ErrorMsg message={error} onRetry={loadProfile} />
      </Layout>
    );
  }

  const sections = [
    {
      title: "Personal Information",
      icon: User,
      fields: [
        { label: "Father's Name", value: profile?.father_name },
        { label: "Gender", value: profile?.gender },
        { label: "Date of Birth", value: profile?.dob?.split('T')[0] },
        { label: "Blood Group", value: profile?.blood_group },

      ]
    },
    {
      title: "Employment Details",
      icon: Award,
      fields: [
        { label: "Employee ID", value: profile?.emp_id, highlight: true },
        { label: "Department", value: profile?.dept_name },

        { label: "Date of Joining", value: profile?.doj?.split('T')[0] },
        { label: "Pay Level", value: profile?.pay_level ? `Level-${profile.pay_level}` : '—' },
        { label: "Basic Pay", value: profile?.basic_pay ? `₹${parseFloat(profile.basic_pay).toLocaleString()}` : '—' },
      ]
    },
    {
      title: "Contact Information",
      icon: Mail,
      fields: [
        { label: "Official Email", value: profile?.official_email },
        { label: "Personal Email", value: profile?.personal_email },
        { label: "Mobile", value: profile?.mobile },
        { label: "Alternate Mobile", value: profile?.alternate_mobile || '—' },
      ]
    },
    {
      title: "Identity & Accounts",
      icon: Landmark,
      fields: [
        { label: "PAN Card No.", value: profile?.pan_number },
        { label: "Aadhaar Card No.", value: profile?.aadhaar_number },
        { label: "PF Account No.", value: profile?.pf_number || '—' },
        { label: "Bank Name", value: profile?.bank_name },
        { label: "Account Number", value: profile?.account_number },
        { label: "IFSC Code", value: profile?.ifsc_code },
      ]
    },
    {
      title: "Posting & Location",
      icon: MapPin,
      fields: [

        { label: "Posting Station", value: profile?.posting_station },
      ]
    },
    {
      title: "Emergency & Nominee Info",
      icon: FileText,
      fields: [
        { label: "Nominee Name", value: profile?.nominee_name },
        { label: "Nominee Relation", value: profile?.nominee_relation },
        { label: "Emergency Contact", value: profile?.emergency_contact_name },
        { label: "Emergency Mobile", value: profile?.emergency_contact_mobile },
      ]
    }
  ];

  return (
    <Layout title="My Profile" theme="light">
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div 
          className="flex flex-col md:flex-row items-center gap-6 p-6 hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <div className="w-24 h-24 rounded-full bg-[#68aae8] flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-[#68aae8]/20 flex-shrink-0">
            {profile?.first_name?.[0]?.toUpperCase()}
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1 justify-center md:justify-start">
              <h2 className="text-2xl font-bold" style={{ color: '#162660' }}>{profile?.first_name} {profile?.last_name}</h2>
              <div className="inline-flex justify-center md:justify-start">
                <Badge text={profile?.status} />
              </div>
            </div>
            <p className="font-semibold text-sm" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>
              {profile?.dept_name}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>
              ID: <span className="font-mono font-semibold" style={{ color: '#68aae8' }}>{profile?.emp_id}</span>
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, idx) => (
            <div 
              key={idx} 
              className="hover-card animate-slide-up"
              style={{
                background: '#fff',
                border: '1px solid rgba(22, 38, 96, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
                animationDelay: `${idx * 40}ms`
              }}
            >
              <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.08)' }}>
                <section.icon style={{ color: '#68aae8' }} size={18} />
                <h3 className="text-sm font-bold mb-0" style={{ color: '#162660' }}>{section.title}</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {section.fields.map((f, fIdx) => (
                  <div key={fIdx} className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>{f.label}</span>
                    <span 
                      className={`text-sm font-medium block truncate`}
                      style={{ 
                        color: f.highlight ? '#68aae8' : '#162660',
                        fontFamily: f.highlight ? 'monospace' : 'inherit'
                      }}
                      title={f.value || '—'}
                    >
                      {f.value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}




