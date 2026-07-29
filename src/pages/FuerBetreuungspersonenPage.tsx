import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Dumbbell,
  Leaf,
  Footprints,
  Home,
  Moon,
  Clock,
  Sun,
  Rabbit,
  Search,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Accordion from '../components/ui/Accordion';
import type { AccordionItem } from '../components/ui/Accordion';

// Target audience cards
interface AudienceCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const audienceCards: AudienceCard[] = [
  {
    icon: <User className="w-8 h-8 text-primary-600" />,
    title: 'Privatpersonen mit Tiererfahrung',
    description:
      'Du liebst Tiere und möchtest anderen helfen? Perfekt – keine Ausbildung nötig, nur Herz und Verantwortungsbewusstsein.',
  },
  {
    icon: <GraduationCap className="w-8 h-8 text-primary-600" />,
    title: 'Professionelle Betreuungspersonen',
    description:
      'Du arbeitest bereits als Tierpfleger:in, Tierassistenz oder ähnliches? Nutze tigube, um mehr Kunden zu erreichen.',
  },
  {
    icon: <Dumbbell className="w-8 h-8 text-primary-600" />,
    title: 'Hundetrainer:innen',
    description:
      'Biete Trainings und Betreuung auf einer Plattform an und werde noch sichtbarer für Tierhalter:innen.',
  },
  {
    icon: <Leaf className="w-8 h-8 text-primary-600" />,
    title: 'Nebenberuf oder Hobby',
    description:
      'Du möchtest dein Hobby zum Nebenberuf machen? tigube macht das einfach.',
  },
];

// Service types
interface ServiceType {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const serviceTypes: ServiceType[] = [
  {
    icon: <Footprints className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Gassi-Service',
    description: 'Tägliche Spaziergänge',
  },
  {
    icon: <Home className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Haussitting',
    description: 'Du betreust das Tier bei Besitzer:innen zuhause',
  },
  {
    icon: <Moon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Übernachtungsbetreuung',
    description: 'Das Tier schläft bei dir',
  },
  {
    icon: <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Kurzbesuche',
    description: 'Zwischendurch vorbeischauen',
  },
  {
    icon: <Sun className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Hundetagesbetreuung',
    description: 'Ganztages-Betreuung bei dir',
  },
  {
    icon: <Rabbit className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />,
    title: 'Kleintierbetreuung',
    description: 'Kaninchen, Katzen, Meerschweinchen etc.',
  },
];

// Feature points
interface FeaturePoint {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const featurePoints: FeaturePoint[] = [
  {
    icon: <Search className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />,
    title: 'Neue Kunden finden',
    description: 'Tierhalter:innen in deiner Region finden dich direkt über tigube.',
  },
  {
    icon: <ClipboardList className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />,
    title: 'Dein eigenes Profil',
    description: 'Präsentiere dich mit Fotos, Beschreibung, Tierarten und Services.',
  },
  {
    icon: <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />,
    title: 'Direkte Anfragen',
    description: 'Interessierte Tierhalter:innen kontaktieren dich über die Plattform.',
  },
  {
    icon: <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />,
    title: 'Vertrauen durch Verifizierung',
    description: 'tigube prüft Profile – das stärkt das Vertrauen bei Tierhalter:innen.',
  },
];

// Registration steps
interface Step {
  number: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Als Betreuungsperson registrieren',
    description: "Wähle beim Registrieren die Rolle 'Betreuungsperson' aus.",
  },
  {
    number: 2,
    title: 'Profil ausfüllen',
    description:
      'Gib an, welche Tiere du betreust, welche Services du anbietest und wo du erreichbar bist.',
  },
  {
    number: 3,
    title: 'Anfragen erhalten',
    description:
      'Sobald du freigeschaltet bist, können Tierhalter:innen dein Profil finden und dich kontaktieren.',
  },
];

// FAQ data
const faqItems: AccordionItem[] = [
  {
    id: 'faq-1',
    title: 'Muss ich professionell ausgebildet sein?',
    content: (
      <p className="text-gray-700">
        Nein. tigube steht sowohl Privatpersonen als auch professionellen Betreuungspersonen offen.
        Wichtig sind Erfahrung und Zuverlässigkeit.
      </p>
    ),
  },
  {
    id: 'faq-2',
    title: 'Wie bekomme ich Anfragen?',
    content: (
      <p className="text-gray-700">
        Nach deiner Freischaltung wirst du in der Suche sichtbar. Tierhalter:innen können dein
        Profil finden und dich direkt kontaktieren.
      </p>
    ),
  },
  {
    id: 'faq-3',
    title: 'Was kostet die Mitgliedschaft als Betreuungsperson?',
    content: (
      <p className="text-gray-700">
        Die Registrierung und Basis-Funktionen sind kostenlos. Für erweiterte Features gibt es
        Premium (ab 4,90 €/Monat) – Details auf der{' '}
        <Link to="/mitgliedschaften" className="text-primary-600 hover:underline">
          Preisseite
        </Link>
        .
      </p>
    ),
  },
  {
    id: 'faq-4',
    title: 'Kann ich mehrere Tierarten und Services anbieten?',
    content: (
      <p className="text-gray-700">
        Ja! Du kannst in deinem Profil beliebig viele Tierarten und Betreuungsarten hinterlegen –
        und sie jederzeit anpassen.
      </p>
    ),
  },
];

export default function FuerBetreuungspersonenPage() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* 1. Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            Betreue Tiere. Gewinne Kunden.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10 px-0 sm:px-2">
            tigube gibt dir die Sichtbarkeit, die du verdient hast – egal ob Privatperson oder
            Profi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Link to="/registrieren?type=caretaker" className="flex-1 sm:flex-initial min-w-0">
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-primary-700 hover:bg-gray-100 font-semibold w-full sm:w-auto min-h-[48px]"
              >
                Jetzt als Betreuungsperson registrieren
              </Button>
            </Link>
            <a href="#so-funktionierts" className="flex-1 sm:flex-initial min-w-0">
              <Button
                variant="outline"
                size="lg"
                className="bg-primary-800 border-primary-800 text-white hover:bg-primary-900 w-full sm:w-auto min-h-[48px]"
              >
                Wie funktioniert das?
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* 2. Target Audience Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Für wen ist tigube als Betreuungsperson geeignet?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {audienceCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100"
              >
                <div className="mb-4">{card.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Services Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Welche Betreuungsarten kannst du anbieten?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {serviceTypes.map((service) => (
              <div
                key={service.title}
                className="flex min-w-0 items-start gap-3 sm:gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5 sm:p-4"
              >
                <div className="flex-shrink-0 rounded-full bg-primary-50 p-2.5 sm:p-3">
                  {service.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-snug text-gray-900 mb-1 break-words hyphens-auto">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500 break-words hyphens-auto">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Benefits Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-primary-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Deine Vorteile auf tigube
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {featurePoints.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 rounded-full bg-white p-2.5 sm:p-3 shadow-sm">
                  {feature.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Registration Steps */}
      <section id="so-funktionierts" className="py-10 sm:py-14 lg:py-16 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              So läuft die Registrierung ab
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold mb-4 flex-shrink-0">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Mitgliedschaft */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6">
          <p className="text-sm sm:text-base md:text-lg font-medium text-center sm:text-left text-balance leading-snug">
            Profil und Anfragen kostenlos – Professional ab 12,90 €/Monat für maximale Sichtbarkeit
          </p>
          <Link to="/mitgliedschaften" className="flex-shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50 font-semibold min-h-[48px] sm:whitespace-nowrap"
            >
              Mitgliedschaften ansehen
            </Button>
          </Link>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 px-1">
              Häufige Fragen von Betreuungspersonen
            </h2>
          </div>
          <Accordion items={faqItems} />
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            Bereit, Tiere zu betreuen und neue Kunden zu gewinnen?
          </h2>
          <Link to="/registrieren?type=caretaker" className="block w-full max-w-sm mx-auto sm:max-w-none sm:inline-block">
            <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-[48px]">
              Jetzt kostenlos registrieren
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Ich bin Tierhalter:in →{' '}
            <Link
              to="/fuer-tierhalter"
              className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
            >
              Zur Seite für Tierhalter:innen
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
