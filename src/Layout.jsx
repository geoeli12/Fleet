import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === createPageUrl("Dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-neutral-200">
      
      {/* Header */}
      <header className="bg-neutral-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            
            {/* Back Button (hidden on Dashboard) */}
            {!isDashboard && (
              <button
                onClick={() => navigate(createPageUrl("Dashboard"))}
                className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition"
              >
                <ArrowLeft size={16} />
                Dashboard
              </button>
            )}

            <Link
              to={createPageUrl("Dashboard")}
              className="flex items-center gap-3"
            >
              <img
                src="/ash_pallet_logo.svg"
                alt="ASH Logo"
                className="h-10 w-10 rounded-md"
              />
              <div>
                <div className="font-bold text-lg">ASH Pallet</div>
                <div className="text-xs text-neutral-400">
                  DriverLog
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
