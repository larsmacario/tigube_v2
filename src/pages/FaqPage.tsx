import React from 'react';
import { Link } from 'react-router-dom';
import Accordion from '../components/ui/Accordion';
import type { AccordionItem } from '../components/ui/Accordion';
import Button from '../components/ui/Button';

const generalItems: AccordionItem[] = [
  {
    id: 'general-1',
    title: 'Was ist tigube?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        tigube ist eine digitale Plattform, die Tierhalter:innen und Betreuungspersonen zusammenbringt. Hier kannst du als Tierhalter:in eine passende Betreuung für dein Tier finden – oder dich als Betreuungsperson registrieren und neue Kunden in deiner Region gewinnen.
      </p>
    ),
  },
  {
    id: 'general-2',
    title: 'Für wen ist tigube gedacht?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        tigube richtet sich an zwei Hauptzielgruppen: Tierhalter:innen, die verlässliche Betreuung für ihr Tier suchen, und Betreuungspersonen, die Tiere professionell oder privat betreuen möchten. Zukünftig werden auch Dienstleister wie Tierärzt:innen, Hundetrainer:innen oder Tierfotograf:innen Teil der Plattform.
      </p>
    ),
  },
  {
    id: 'general-3',
    title: 'Welche Tiere können über tigube betreut werden?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Aktuell fokussiert sich tigube auf Hunde, Katzen und Kleintiere (z. B. Kaninchen, Meerschweinchen). Weitere Tierarten werden schrittweise ergänzt.
      </p>
    ),
  },
  {
    id: 'general-4',
    title: 'Ist tigube schon live?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Ja, tigube ist online und nutzbar. Die Plattform befindet sich aktuell im Aufbau des Startpools – das heißt, wir gewinnen aktiv erste Tierhalter:innen und Betreuungspersonen. Melde dich jetzt an und profitiere von den Vorteilen der frühen Mitglieder.
      </p>
    ),
  },
  {
    id: 'general-5',
    title: 'Wie buche ich Premium oder Professional?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Unter{' '}
        <Link to="/mitgliedschaften" className="text-primary-600 hover:underline">
          Mitgliedschaften
        </Link>{' '}
        wählst du deinen Plan und zahlst sicher über Stripe. Dein Abo kannst du im Kundenportal
        jederzeit verwalten oder kündigen.
      </p>
    ),
  },
];

const ownerItems: AccordionItem[] = [
  {
    id: 'owner-1',
    title: 'Wie finde ich passende Betreuung für mein Tier?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Nach deiner Registrierung kannst du Betreuungspersonen in deiner Region suchen, Profile ansehen und direkt Kontakt aufnehmen. Du entscheidest selbst, wer am besten zu dir und deinem Tier passt.
      </p>
    ),
  },
  {
    id: 'owner-2',
    title: 'Was passiert, wenn in meiner Region noch wenige Betreuungspersonen aktiv sind?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Da der Startpool gerade aufgebaut wird, kann es in manchen Regionen noch überschaubar sein. Registriere dich trotzdem – du wirst benachrichtigt, sobald neue Betreuungspersonen in deiner Nähe aktiv werden.
      </p>
    ),
  },
  {
    id: 'owner-3',
    title: 'Muss ich direkt nach der Registrierung buchen?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Nein. Du kannst dich registrieren, Profile ansehen und Kontakt aufnehmen – ganz ohne Druck oder sofortige Buchungspflicht.
      </p>
    ),
  },
  {
    id: 'owner-4',
    title: 'Was kostet die Nutzung von tigube?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Für Tierhalter:innen ist die Basis-Nutzung kostenlos. Premium-Funktionen (z. B. erweiterte Filter, bevorzugte Sichtbarkeit) sind im Rahmen der Mitgliedschaft verfügbar.
      </p>
    ),
  },
  {
    id: 'owner-5',
    title: 'Warum lohnt es sich, sich schon jetzt zu registrieren?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Frühe Mitglieder haben Zugang zu den ersten verfügbaren Betreuungspersonen und helfen mit, die Plattform für ihre Region aufzubauen.
      </p>
    ),
  },
];

const caretakerItems: AccordionItem[] = [
  {
    id: 'caretaker-1',
    title: 'Für wen ist tigube als Betreuungsperson geeignet?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Für alle, die Tiere betreuen möchten – ob privat oder professionell. Du musst keine Ausbildung haben. Wichtig ist Erfahrung im Umgang mit Tieren und die Bereitschaft, zuverlässig und verantwortungsvoll zu sein.
      </p>
    ),
  },
  {
    id: 'caretaker-2',
    title: 'Muss ich professionell oder selbstständig arbeiten?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Nein. tigube steht sowohl Privatpersonen als auch professionellen Betreuungspersonen offen. Du entscheidest selbst, welche Leistungen du anbietest und zu welchem Preis.
      </p>
    ),
  },
  {
    id: 'caretaker-3',
    title: 'Wie läuft die Registrierung ab?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Gehe auf „Registrieren", wähle die Rolle Betreuungsperson aus und fülle dein Profil aus: Tierarten, Betreuungsarten, Verfügbarkeit und eine kurze Beschreibung von dir. Nach der Überprüfung durch unser Team wirst du freigeschaltet.
      </p>
    ),
  },
  {
    id: 'caretaker-4',
    title: 'Was kostet die Mitgliedschaft?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Die Registrierung und Basis-Funktionen sind kostenlos. Premium für Tierhalter:innen (ab 4,90 €/Monat) und Professional für Betreuungspersonen (ab 12,90 €/Monat) findest du auf der{' '}
        <Link to="/mitgliedschaften" className="text-primary-600 hover:underline">
          Preisseite
        </Link>
        .
      </p>
    ),
  },
  {
    id: 'caretaker-5',
    title: 'Warum ist es sinnvoll, früh Teil des Startpools zu werden?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Wer früh dabei ist, wird zuerst in Suchergebnissen gezeigt, kann mehr Anfragen erhalten und profitiert von der Aufmerksamkeit beim Plattformstart.
      </p>
    ),
  },
];

const partnerItems: AccordionItem[] = [
  {
    id: 'partner-1',
    title: 'Für wen ist dieser Bereich gedacht?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Für Fachleute rund ums Tier: Tierärzt:innen, Hundetrainer:innen, Tierfotograf:innen, Tierfriseure und ähnliche Berufsgruppen, die sich auf tigube präsentieren möchten.
      </p>
    ),
  },
  {
    id: 'partner-2',
    title: 'Welche Berufsgruppen können sich präsentieren?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Aktuell können sich unter anderem Veterinäre, Hundetrainer:innen, Tierfotograf:innen, Physiotherapeut:innen für Tiere und Ernährungsberater:innen registrieren. Die Liste wird erweitert.
      </p>
    ),
  },
  {
    id: 'partner-3',
    title: 'Wie unterscheiden sich Dienstleister von Betreuungspersonen?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Betreuungspersonen übernehmen das aktive Betreuen von Tieren (Gassi, Haussitting etc.). Dienstleister bieten ergänzende Fachleistungen an (Training, Tierarztbesuche, Fotoshooting etc.) und werden auf tigube als Expert:innen für ihr Fachgebiet sichtbar.
      </p>
    ),
  },
  {
    id: 'partner-4',
    title: 'Was bringt mir eine Präsenz auf tigube?',
    content: (
      <p className="text-gray-700 leading-relaxed">
        Du wirst für eine Zielgruppe sichtbar, die aktiv nach tierischen Dienstleistungen sucht. Du kannst dein Profil mit Fotos, Beschreibung und Kontaktmöglichkeiten gestalten und neue Kunden gewinnen.
      </p>
    ),
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Häufige Fragen
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed px-1 text-white/90">
              Alles, was du über tigube wissen möchtest – für Tierhalter:innen, Betreuungspersonen und Partner.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="py-10 sm:py-14 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-10">

          {/* Block 1 — Allgemein */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
            <h2 className="text-primary-700 font-semibold text-lg sm:text-xl mb-3 sm:mb-4">
              Allgemein
            </h2>
            <Accordion items={generalItems} allowMultiple />
          </div>

          {/* Block 2 — Für Tierhalter:innen */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
            <h2 className="text-primary-700 font-semibold text-lg sm:text-xl mb-3 sm:mb-4">
              Für Tierhalter:innen
            </h2>
            <Accordion items={ownerItems} allowMultiple />
          </div>

          {/* Block 3 — Für Betreuungspersonen */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
            <h2 className="text-primary-700 font-semibold text-lg sm:text-xl mb-3 sm:mb-4">
              Für Betreuungspersonen
            </h2>
            <Accordion items={caretakerItems} allowMultiple />
          </div>

          {/* Block 4 — Dienstleister & Partner */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
            <h2 className="text-primary-700 font-semibold text-lg sm:text-xl mb-3 sm:mb-4">
              Dienstleister &amp; Partner
            </h2>
            <Accordion items={partnerItems} allowMultiple />
          </div>

          {/* CTA Section */}
          <div className="bg-primary-50 rounded-xl p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
              Bereit loszulegen?
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center max-w-md sm:max-w-none mx-auto">
              <Link to="/registrieren" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-[48px]">
                  Als Tierhalter:in registrieren
                </Button>
              </Link>
              <Link to="/registrieren?type=caretaker" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-[48px]">
                  Als Betreuungsperson registrieren
                </Button>
              </Link>
            </div>
            <p className="mt-5 sm:mt-6 text-sm text-gray-600 px-1">
              Noch offene Fragen? Schreib uns unter{' '}
              <a
                href="mailto:hallo@tigube.de"
                className="text-primary-700 hover:text-primary-800 underline"
              >
                hallo@tigube.de
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default FaqPage;
