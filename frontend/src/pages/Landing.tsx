import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRightIcon,
  PhoneIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  StarIcon,
  InformationCircleIcon,
  LockClosedIcon,
  ClipboardDocumentCheckIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import {
  ShieldCheckIcon as ShieldCheckSolid,
} from '@heroicons/react/24/solid';
import api from '../services/api';
import { getAppDownloadUrl } from '../utils/config';

// ------------------------------
// Small helpers
// ------------------------------
function classNames(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

// ------------------------------
// Types
// ------------------------------
interface PublicAppVersion {
  _id: string;
  appType: 'main' | 'emergency' | string;
  version: string;
  downloadCount?: number;
  description?: string;
  features?: string[];
}

// ------------------------------
// Page
// ------------------------------
export default function Landing() {
  // Fetch public app versions
  const { data: appVersionsData, isLoading: appsLoading } = useQuery({
    queryKey: ['public-app-versions'],
    queryFn: async () => {
      const response = await api.get('/app-management/public/versions');
      return response.data as { data: PublicAppVersion[] };
    },
  });

  const appVersions = appVersionsData?.data || [];
  const mainApp = appVersions.find((app) => app.appType === 'main');
  const emergencyApp = appVersions.find((app) => app.appType === 'emergency');

  const handleDownload = (appId: string) => {
    const downloadUrl = getAppDownloadUrl(appId);
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Notice Bar */}
      <div className="bg-gray-900 text-gray-100">
        <div className="container-responsive py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <LockClosedIcon className="h-4 w-4" />
            <span>No self‑signup. Access is invite‑only. Call us to get access.</span>
          </div>
          <a
            href="tel:9771616777"
            className="inline-flex items-center gap-2 font-medium hover:opacity-90"
          >
            <PhoneIcon className="h-4 w-4" /> 9771616777
          </a>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="container-responsive h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 grid place-items-center shadow-glow">
              <RocketLaunchIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">RepoTrack</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#apps" className="nav-item">Mobile Apps</a>
            <a href="#why" className="nav-item">Why RepoTrack</a>
            <a href="#faq" className="nav-item">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="tel:9771616777" className="btn btn-ghost hidden sm:inline-flex">
              <PhoneIcon className="h-5 w-5 mr-2" /> Call Us
            </a>
            <Link to="/login" className="btn btn-primary btn-md">
              Login <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-yellow-50 via-white to-orange-50" />
        <div className="container-responsive py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-semibold mb-5">
              <ShieldCheckSolid className="h-4 w-4 text-green-600" />
              Enterprise vehicle repossession platform
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Run repossessions with <span className="text-gradient">speed, control & security</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl">
              Track assets, dispatch agents, and close recoveries faster. Login to your org or call us to get access—no self‑signup on this platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login" className="btn btn-primary btn-lg">
                Login to Dashboard
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
              <a href="tel:9771616777" className="btn btn-outline-primary btn-lg">
                Call to Get Access
              </a>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-gray-600">
              <StarIcon className="h-4 w-4 text-yellow-500" /> Trusted ops teams • 24/7 support • SOC2-style practices
            </div>
          </div>

          <div className="card p-6 lg:p-8 shadow-xl border-yellow-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Quick actions</h3>
              <InformationCircleIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link to="/login" className="card card-body hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold">Login to Web Console</p>
                    <p className="text-sm text-gray-600">Manage vehicles, agents, routes & proofs</p>
                  </div>
                </div>
              </Link>
              <a href="#apps" className="card card-body hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <DevicePhoneMobileIcon className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-semibold">Download Mobile Apps</p>
                    <p className="text-sm text-gray-600">Field‑ready Android builds</p>
                  </div>
                </div>
              </a>
            </div>
            <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
              <p className="font-medium">Need an account?</p>
              <p>Access is invite‑only. <a className="underline font-semibold" href="tel:9771616777">Call 9771616777</a> to get onboarded.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Why Section */}
      <section id="why" className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Built for field precision</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything your recovery ops need—without the noise. Fast workflows, strong security, and real‑time visibility.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Bulk Excel Upload',
                desc: 'Import thousands of vehicles in minutes with validated Excel parsing.',
              },
              {
                title: 'Live Tracking',
                desc: 'See agent location, status and ETAs in real‑time for every assignment.',
              },
              {
                title: 'OTP-secured Proofs',
                desc: 'Tamper‑resistant proofs with OTP and time/location stamps.',
              },
              {
                title: 'Role-based Access',
                desc: 'Granular controls for admins, supervisors and field agents.',
              },
              {
                title: 'Analytics that matter',
                desc: 'Recovery rate, SLA, route performance—clean dashboards for action.',
              },
              {
                title: 'Offline-first mobile',
                desc: 'Search & capture proofs even with poor connectivity.',
              },
            ].map((f) => (
              <div key={f.title} className="card card-body">
                <div className="flex items-start gap-3">
                  <CheckIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-gray-600 text-sm">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Apps */}
      <section id="apps" className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container-responsive">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold mb-4">
              <DevicePhoneMobileIcon className="h-4 w-4" /> Android builds
            </div>
            <h2 className="text-3xl font-bold mb-3">Download our mobile apps</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Field‑ready APKs for on‑ground teams. Choose the app that matches your workflow.
            </p>
          </div>

          {appsLoading ? (
            <div className="grid lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="card p-8 animate-pulse">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                  <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-4/5 bg-gray-200 rounded" />
                    <div className="h-10 w-40 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : appVersions.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-6">
              {mainApp && (
                <AppCard
                  tone="blue"
                  title="Main App"
                  subtitle="Full features • Offline search"
                  app={mainApp}
                  onDownload={() => handleDownload(mainApp._id)}
                />
              )}
              {emergencyApp && (
                <AppCard
                  tone="red"
                  title="Emergency App"
                  subtitle="Lightweight • Online only"
                  app={emergencyApp}
                  onDownload={() => handleDownload(emergencyApp._id)}
                />
              )}
            </div>
          ) : (
            <div className="text-center card p-10">
              <DevicePhoneMobileIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="font-medium">Mobile apps are being prepared for release.</p>
              <p className="text-sm text-gray-600">Check back soon or call us for early access.</p>
            </div>
          )}

          {/* Install guide */}
          <div className="mt-10 card p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">How to install the APK</h3>
            <ol className="grid sm:grid-cols-2 gap-3 text-gray-700">
              {[
                'Download the APK to your device',
                'Enable “Install from Unknown Sources”',
                'Open the APK and tap Install',
                'Launch app and login with your org credentials',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="badge badge-info">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheckIcon className="h-4 w-4 text-green-600" /> All builds are signed and verified. Compatible with Android 6.0+.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="container-responsive">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">FAQ</h2>
            <p className="text-gray-600">Short answers to help you get started quickly.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Faq
              q="Can I sign up myself?"
              a="No. RepoTrack is invite‑only for verified organizations. Please call 9771616777 to request access."
            />
            <Faq
              q="How do I login?"
              a="Use the Login button and enter the credentials issued by your organization admin."
            />
            <Faq
              q="Where do I download the mobile app?"
              a="Scroll to the Mobile Apps section above and choose the APK for your use‑case."
            />
            <Faq
              q="Is my data secure?"
              a="Yes. We follow strong security practices including OTP‑gated proofs and role‑based access."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900">
        <div className="container-responsive text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Ready to access RepoTrack?</h2>
          <p className="text-gray-300 mb-8">Login if you already have credentials—or call us to get access.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn btn-primary btn-lg">
              Login Now <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Link>
            <a href="tel:9771616777" className="btn btn-ghost btn-lg text-white border-white">
              Call 9771616777
            </a>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-gray-300">
            <ShieldCheckSolid className="h-5 w-5 text-green-500" />
            <span>Operational 24/7 • Uptime focused</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container-responsive py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 grid place-items-center">
                  <ShieldCheckSolid className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">RepoTrack</span>
              </div>
              <p className="text-sm text-gray-600 max-w-sm">
                Built for serious recovery operations. Precision workflows, reliable apps, real‑time visibility.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Contact</p>
              <div className="flex items-center text-gray-700 gap-2">
                <PhoneIcon className="h-5 w-5" />
                <a className="hover:underline" href="tel:9771616777">9771616777</a>
              </div>
              <p className="text-sm text-gray-600 mt-2">Deoghar, Jharkhand, India</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Access</p>
              <ul className="space-y-2 text-sm">
                <li><Link className="hover:underline" to="/login">Login</Link></li>
                <li><a className="hover:underline" href="#apps">Download Apps</a></li>
                <li><a className="hover:underline" href="#faq">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-6 flex items-center justify-between text-sm text-gray-600">
            <span>© {new Date().getFullYear()} RepoTrack. All rights reserved.</span>
            <span className="inline-flex items-center gap-2"><ShieldCheckSolid className="h-4 w-4 text-green-600" /> SOC 2–style controls</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ------------------------------
// Components
// ------------------------------
function AppCard({
  tone,
  title,
  subtitle,
  app,
  onDownload,
}: {
  tone: 'blue' | 'red';
  title: string;
  subtitle: string;
  app: PublicAppVersion;
  onDownload: () => void;
}) {
  const toneClasses =
    tone === 'blue'
      ? {
          ring: 'ring-blue-100',
          pill: 'bg-blue-600',
          pillText: 'text-white',
          badge: 'bg-green-100 text-green-800',
          btn: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
        }
      : {
          ring: 'ring-red-100',
          pill: 'bg-red-600',
          pillText: 'text-white',
          badge: 'bg-green-100 text-green-800',
          btn: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
        };

  return (
    <div className={classNames('card p-6 lg:p-8 border', toneClasses.ring)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', toneClasses.badge)}>
          Active
        </span>
      </div>

      {app.description && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
          {app.description}
        </div>
      )}

      {app.features && app.features.length > 0 && (
        <ul className="mb-6 space-y-2">
          {app.features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
              <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Latest:</span> v{app.version}
          <br />
          <span>{app.downloadCount || 0} downloads</span>
        </div>
        <button
          onClick={onDownload}
          className={classNames(
            'inline-flex items-center px-5 py-2.5 rounded-lg text-white font-medium shadow-lg transition-all duration-200 bg-gradient-to-r',
            toneClasses.btn
          )}
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" /> Download APK
        </button>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="card p-5">
      <p className="font-semibold mb-1">{q}</p>
      <p className="text-gray-600 text-sm">{a}</p>
    </div>
  );
}