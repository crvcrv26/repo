import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  PhoneIcon,
  CheckIcon,
  PlayIcon,
  DocumentArrowUpIcon,
  MapPinIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  StarIcon,
  ChartBarIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { 
  ChartBarIcon as ChartBarSolid,
  ShieldCheckIcon as ShieldCheckSolid 
} from '@heroicons/react/24/solid';

const features = [
  {
    icon: DocumentArrowUpIcon,
    title: 'Bulk Excel Upload',
    description: 'Upload thousands of vehicle records instantly with our advanced Excel processing system.',
    color: 'text-yellow-600'
  },
  {
    icon: MapPinIcon,
    title: 'Vehicle Tracking',
    description: 'Real-time GPS tracking and status updates for complete visibility of your fleet.',
    color: 'text-orange-600'
  },
  {
    icon: UserGroupIcon,
    title: 'Agent Management',
    description: 'Efficiently assign and manage field agents with role-based access controls.',
    color: 'text-pink-600'
  },
  {
    icon: ShieldCheckIcon,
    title: 'OTP Security',
    description: 'Enterprise-grade security with two-factor authentication and encrypted data.',
    color: 'text-blue-600'
  }
];

const stats = [
  { value: '50,000+', label: 'Vehicles Managed' },
  { value: '99.9%', label: 'Uptime Guaranteed' },
  { value: '500+', label: 'Active Agents' },
  { value: '24/7', label: 'Support Available' }
];

const testimonials = [
  {
    quote: "This system revolutionized our repossession operations. We've seen a 40% increase in efficiency.",
    author: "Sarah Johnson",
    role: "Operations Manager",
    company: "National Auto Finance",
    avatar: "/avatar1.jpg"
  },
  {
    quote: "The real-time tracking and agent management features are game-changers for our business.",
    author: "Michael Chen",
    role: "Fleet Director",
    company: "Metro Recovery Services",
    avatar: "/avatar2.jpg"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b-2 border-gray-300 sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <ChartBarSolid className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">RepoTrack</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 font-medium">Contact</a>
              <div className="flex items-center text-gray-600">
                <PhoneIcon className="h-5 w-5 mr-2" />
                <span className="font-semibold">+1 (555) 123-4567</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-orange-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  <StarIcon className="h-4 w-4 mr-2" />
                  #1 Vehicle Repossession Platform
                </div>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Streamline Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"> Vehicle Recovery</span>
                Operations
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The most comprehensive vehicle repossession management system. Track assets, manage agents, 
                and optimize operations with enterprise-grade security and real-time insights.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to="/login"
                  className="btn btn-primary btn-lg group"
                >
                  Get Started Now
                  <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <button className="btn btn-outline btn-lg group">
                  <PlayIcon className="mr-2 h-5 w-5" />
                  Watch Demo
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl overflow-hidden">
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <ChartBarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Dashboard Preview</p>
                      <p className="text-sm opacity-75">Interactive Demo Coming Soon</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500">Live Dashboard</div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ✨ Real-time Updates
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools you need to manage vehicle repossessions 
              efficiently and profitably.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card card-body text-center group">
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-6 group-hover:scale-110 transition-transform duration-200 ${feature.color}`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Advanced Analytics & Reporting
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Get deep insights into your operations with our comprehensive analytics dashboard. 
                Track performance metrics, optimize routes, and maximize recovery rates.
              </p>
              
              <div className="space-y-4">
                {[
                  'Real-time performance dashboards',
                  'Automated compliance reporting',
                  'Predictive analytics for route optimization',
                  'Custom KPI tracking and alerts'
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-900">Performance Overview</h4>
                <div className="flex items-center text-green-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Recovery Rate</span>
                  <span className="font-bold text-gray-900">94.2%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{width: '94.2%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Agents</span>
                  <span className="font-bold text-gray-900">127</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{width: '78%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average Response</span>
                  <span className="font-bold text-gray-900">2.4 hrs</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style={{width: '89%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers are saying about RepoTrack
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card card-body">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-lg text-gray-700 mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-gray-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Join thousands of professionals who trust RepoTrack for their vehicle recovery operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="btn btn-primary btn-lg"
            >
              Start Free Trial
            </Link>
            <button className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-gray-900">
              Schedule Demo
            </button>
          </div>
          
          <p className="text-gray-400 mt-8 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-50 border-t-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <ChartBarSolid className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">RepoTrack</span>
              </div>
              <p className="text-gray-600 mb-6 max-w-md">
                The leading vehicle repossession management platform trusted by professionals worldwide.
              </p>
              
              <div className="flex items-center text-gray-600 mb-2">
                <PhoneIcon className="h-5 w-5 mr-3" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPinIcon className="h-5 w-5 mr-3" />
                <span>123 Business Ave, Suite 100, New York, NY 10001</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
                <li><a href="#support" className="text-gray-600 hover:text-gray-900">Support</a></li>
                <li><a href="#docs" className="text-gray-600 hover:text-gray-900">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
                <li><a href="#terms" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
                <li><a href="#security" className="text-gray-600 hover:text-gray-900">Security</a></li>
                <li><a href="#compliance" className="text-gray-600 hover:text-gray-900">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t-2 border-gray-300 pt-8 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-600">
                © {new Date().getFullYear()} RepoTrack. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <ShieldCheckSolid className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">SOC 2 Certified</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}