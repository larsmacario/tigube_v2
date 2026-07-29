import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plane, AlertCircle, Star, Dog, Cat, Rabbit, Bird } from 'lucide-react';
import Button from '../components/ui/Button';
import Accordion from '../components/ui/Accordion';
import type { AccordionItem } from '../components/ui/Accordion';

// Situation cards data
interface SituationCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const situationCards: SituationCard[] = [
  {
    icon: <Briefcase className="w-8 h-8 text-primary-600" />,
    title: 'Berufstätige',
    description:
      'Du arbeitest lange oder unregelmäßig? Finde jemanden, der deinen Hund Gassi führt oder deine Katze versorgt.',
  },
  {
    icon: <Plane className="w-8 h-8 text-primary-600" />,
    title: 'Urlaub & Reisen',
    description:
      'Damit du entspannt verreisen kannst – mit einer Betreuungsperson, die du kennst und vertraust.',
  },
  {
    icon: <AlertCircle className="w-8 h-8 text-primary-600" />,
    title: 'Notfall',
    description:
      'Manchmal kommt es unerwartet. tigube hilft dir, auch kurzfristig Betreuung zu finden.',
  },
  {
    icon: <Star className="w-8 h-8 text-primary-600" />,
    title: 'Regelmäßige Unterstützung',
    description:
      'Du brauchst verlässliche Hilfe im Alltag? Bau eine langfristige Beziehung mit deiner Betreuungsperson auf.',
  },
];

// Animal types data
interface AnimalType {
  icon: React.ReactNode;
  label: string;
  services: string;
}

const animalTypes: AnimalType[] = [
  {
    icon: <Dog className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600 shrink-0" />,
    label: 'Hunde',
    services: 'Gassi, Tagesbetreuung, Übernachtung',
  },
  {
    icon: <Cat className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600 shrink-0" />,
    label: 'Katzen',
    services: 'Hausbesuche, Übernachtungsbetreuung',
  },
  {
    icon: <Rabbit className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600 shrink-0" />,
    label: 'Kleintiere',
    services: 'Kaninchen, Meerschweinchen, Hamster',
  },
  {
    icon: <Bird className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600 shrink-0" />,
    label: 'Vögel & weitere',
    services: 'Weitere Tierarten in Planung',
  },
];

// Steps data
interface Step {
  number: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Registrieren',
    description:
      'Erstelle dein kostenloses Profil und gib an, welche Tiere du hast.',
  },
  {
    number: 2,
    title: 'Betreuungspersonen finden',
    description:
      'Suche in deiner Region nach passenden Betreuungspersonen und lies ihre Profile.',
  },
  {
    number: 3,
    title: 'Kontakt aufnehmen',
    description:
      'Schreib direkt über tigube – und vereinbare Betreuung ganz unkompliziert.',
  },
];

// FAQ data
const faqItems: AccordionItem[] = [
  {
    id: 'faq-1',
    title: 'Wie finde ich eine Betreuungsperson in meiner Nähe?',
    content: (
      <p className="text-gray-700">
        Nach der Registrierung kannst du Betreuungspersonen in deiner Region suchen und ihre
        Profile ansehen. Du entscheidest, wen du kontaktierst.
      </p>
    ),
  },
  {
    id: 'faq-2',
    title: 'Was passiert, wenn es in meiner Region noch wenige Angebote gibt?',
    content: (
      <p className="text-gray-700">
        Der Startpool wächst täglich. Registriere dich jetzt – du wirst automatisch
        benachrichtigt, wenn neue Betreuungspersonen in deiner Nähe aktiv werden.
      </p>
    ),
  },
  {
    id: 'faq-3',
    title: 'Muss ich sofort buchen?',
    content: (
      <p className="text-gray-700">
        Nein. Du kannst Profile entdecken, Kontakt aufnehmen und in Ruhe entscheiden –
        ganz ohne Druck.
      </p>
    ),
  },
  {
    id: 'faq-4',
    title: 'Was kostet die Nutzung für Tierhalter:innen?',
    content: (
      <p className="text-gray-700">
        Die Basis-Nutzung ist kostenlos. Mit der Premium-Mitgliedschaft bekommst du Zugang
        zu erweiterten Funktionen.
      </p>
    ),
  },
];

export default function FuerTierhalterPage() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* 1. Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            Tierbetreuung, der du vertraust
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10 px-0 sm:px-2">
            tigube verbindet dich mit erfahrenen Betreuungspersonen in deiner Nähe –
            für Alltag, Urlaub oder den Notfall.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Link to="/registrieren" className="flex-1 sm:flex-initial min-w-0">
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-primary-700 hover:bg-gray-100 font-semibold w-full sm:w-auto min-h-[48px]"
              >
                Jetzt kostenlos registrieren
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

      {/* 2. Situationen-Sektion */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Für welche Situationen ist tigube sinnvoll?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {situationCards.map((card) => (
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

      {/* 3. Welche Tiere werden betreut? */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Für welche Tiere?
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {animalTypes.map((animal) => (
              <div key={animal.label} className="flex flex-col items-center text-center p-2 sm:p-4 min-w-0">
                <div className="rounded-full bg-primary-50 p-3 sm:p-4 mb-3 sm:mb-4 inline-flex">
                  {animal.icon}
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{animal.label}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-snug">{animal.services}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. So funktioniert es */}
      <section id="so-funktionierts" className="py-10 sm:py-14 lg:py-16 bg-primary-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              So funktioniert es
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

      {/* 5. Mitgliedschaft */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6">
          <p className="text-sm sm:text-base md:text-lg font-medium text-center sm:text-left text-balance leading-snug">
            Basis-Nutzung kostenlos – Premium ab 4,90 €/Monat für mehr Kontakte und Filter
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

      {/* 6. FAQ */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 px-1">
              Häufige Fragen von Tierhalter:innen
            </h2>
          </div>
          <Accordion items={faqItems} />
        </div>
      </section>

      {/* 7. Abschluss-CTA */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            Bereit, die passende Betreuung zu finden?
          </h2>
          <Link to="/registrieren" className="block w-full max-w-sm mx-auto sm:max-w-none sm:inline-block">
            <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-[48px]">
              Kostenlos registrieren
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Ich bin Betreuungsperson →{' '}
            <Link
              to="/fuer-betreuungspersonen"
              className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
            >
              Zur Seite für Betreuungspersonen
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
