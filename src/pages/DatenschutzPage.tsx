import React from 'react';

function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Datenschutz</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Datenschutzerklärung</h2>
          <p className="text-gray-600 mb-2">der tierisch gut betreut GmbH</p>
          <p className="text-sm text-gray-500 mb-8">Stand: 22.03.2026</p>

          <div className="space-y-10 text-gray-700">

            {/* Intro */}
            <section>
              <p className="leading-relaxed">
                Wir, die tierisch gut betreut GmbH, nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir verarbeiten
                Ihre Daten ausschließlich auf Grundlage der gesetzlichen Bestimmungen, insbesondere der
                Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG). In dieser
                Datenschutzerklärung informieren wir Sie über Art, Umfang und Zweck der von uns verarbeiteten
                personenbezogenen Daten, die Rechtsgrundlagen der Verarbeitung, Ihre Rechte und die von uns eingesetzten
                Technologien.
              </p>
            </section>

            {/* 1. Verantwortlicher */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                1. Name und Kontaktdaten des Verantwortlichen
              </h3>
              <p className="mb-3">Verantwortlicher im Sinne der DSGVO ist:</p>
              <div className="bg-gray-50 p-5 rounded-lg space-y-1">
                <p className="font-semibold">tierisch gut betreut GmbH</p>
                <p>Iznangerstr. 32</p>
                <p>78345 Moos</p>
                <p>Deutschland</p>
                <p>
                  E-Mail:{' '}
                  <a href="mailto:datenschutz@tigube.de" className="text-primary-600 hover:underline">
                    datenschutz@tigube.de
                  </a>
                </p>
              </div>
            </section>

            {/* 2. Allgemeines */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">2. Allgemeines zur Datenverarbeitung</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    a) Umfang der Verarbeitung personenbezogener Daten
                  </h4>
                  <p className="leading-relaxed">
                    Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung
                    einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung
                    personenbezogener Daten unserer Nutzer erfolgt regelmäßig nur nach Einwilligung des Nutzers, es sei
                    denn, die Verarbeitung der Daten ist durch gesetzliche Vorschriften gestattet oder zur Erfüllung eines
                    Vertrages erforderlich.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    b) Rechtsgrundlagen für die Verarbeitung personenbezogener Daten
                  </h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      Soweit wir für Verarbeitungsvorgänge personenbezogener Daten eine Einwilligung der betroffenen Person
                      einholen, dient Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO (für besondere
                      Kategorien personenbezogener Daten) als Rechtsgrundlage.
                    </p>
                    <p>
                      Bei der Verarbeitung von personenbezogenen Daten, die zur Erfüllung eines Vertrages, dessen
                      Vertragspartei die betroffene Person ist, erforderlich ist, dient Art. 6 Abs. 1 lit. b DSGVO als
                      Rechtsgrundlage. Dies gilt auch für Verarbeitungsvorgänge, die zur Durchführung vorvertraglicher
                      Maßnahmen erforderlich sind.
                    </p>
                    <p>
                      Soweit eine Verarbeitung personenbezogener Daten zur Erfüllung einer rechtlichen Verpflichtung
                      erforderlich ist, der unser Unternehmen unterliegt, dient Art. 6 Abs. 1 lit. c DSGVO als
                      Rechtsgrundlage.
                    </p>
                    <p>
                      Für den Fall, dass lebenswichtige Interessen der betroffenen Person oder einer anderen natürlichen
                      Person eine Verarbeitung personenbezogener Daten erforderlich machen, dient Art. 6 Abs. 1 lit. d
                      DSGVO als Rechtsgrundlage.
                    </p>
                    <p>
                      Ist die Verarbeitung zur Wahrung eines berechtigten Interesses unseres Unternehmens oder eines
                      Dritten erforderlich und überwiegen die Interessen, Grundrechte und Grundfreiheiten des Betroffenen
                      das erstgenannte Interesse nicht, so dient Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage für die
                      Verarbeitung. Unser berechtigtes Interesse liegt insbesondere im sicheren und wirtschaftlichen Betrieb
                      der Plattform.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">c) Datenlöschung und Speicherdauer</h4>
                  <p className="leading-relaxed mb-3">
                    Die personenbezogenen Daten der betroffenen Person werden gelöscht oder gesperrt, sobald der Zweck der
                    Speicherung entfällt. Eine Speicherung kann darüber hinaus erfolgen, wenn dies durch den europäischen
                    oder nationalen Gesetzgeber in unionsrechtlichen Verordnungen, Gesetzen oder sonstigen Vorschriften,
                    denen der Verantwortliche unterliegt, vorgesehen wurde.
                  </p>
                  <p className="mb-3 font-medium">Konkret gelten folgende Fristen:</p>
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <span className="text-primary-600 font-bold mt-0.5">•</span>
                      <span>
                        <strong>Profildaten (Tierbesitzer und Tierbetreuer):</strong> Die Profildaten werden gespeichert,
                        solange das Nutzerkonto aktiv ist. Bei Inaktivität von 365 Tagen oder Löschung des Accounts durch
                        den Nutzer werden die Profildaten (Name, Adresse, E-Mail, Telefonnummer, Profilbild,
                        Tierinformationen, Zertifikate, etc.) gelöscht.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary-600 font-bold mt-0.5">•</span>
                      <span>
                        <strong>Abonnement- und Zahlungsdaten:</strong> Daten zu Ihren Abonnements und Zahlungen werden für
                        die Dauer der gesetzlichen Aufbewahrungspflichten (z.B. 10 Jahre nach Handels- und Steuerrecht)
                        gespeichert.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary-600 font-bold mt-0.5">•</span>
                      <span>
                        <strong>Kommunikationsdaten (Nachrichten):</strong> Nachrichten zwischen Tierbesitzern und
                        Tierbetreuern werden spätestens 12 Monate nach Abschluss der letzten Betreuung oder der letzten
                        Kommunikation gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary-600 font-bold mt-0.5">•</span>
                      <span>
                        <strong>Logfiles:</strong> Logfiles (IP-Adressen, Zeitstempel, Geräteinformationen) werden in der
                        Regel für einen kurzen Zeitraum (7–30 Tage) zu Sicherheitszwecken gespeichert und anschließend
                        gelöscht.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. Logfiles */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                3. Bereitstellung der Website und Erstellung von Logfiles
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    a) Beschreibung und Umfang der Datenverarbeitung
                  </h4>
                  <p className="leading-relaxed mb-3">
                    Bei jedem Aufruf unserer Internetseite erfasst unser System automatisiert Daten und Informationen vom
                    Computersystem des aufrufenden Rechners. Folgende Daten werden hierbei erhoben:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>IP-Adresse des Nutzers</li>
                    <li>Datum und Uhrzeit des Zugriffs</li>
                    <li>Browsertyp und -version</li>
                    <li>Verwendetes Betriebssystem</li>
                    <li>Referrer URL (die zuvor besuchte Seite)</li>
                    <li>Seiten, die von Ihrem System über unsere Website aufgerufen werden</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    b) Rechtsgrundlage für die Datenverarbeitung
                  </h4>
                  <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">c) Zweck der Datenverarbeitung</h4>
                  <p className="leading-relaxed">
                    Die vorübergehende Speicherung der IP-Adresse ist notwendig, um eine Auslieferung der Website an den
                    Rechner des Nutzers zu ermöglichen. Die Speicherung in Logfiles erfolgt, um die Funktionsfähigkeit der
                    Website sicherzustellen und die Sicherheit unserer IT-Systeme zu gewährleisten. Eine Auswertung zu
                    Marketingzwecken findet nicht statt.
                  </p>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">d) Dauer der Speicherung</h4>
                  <p className="leading-relaxed">
                    Die Daten werden spätestens nach 7–30 Tagen gelöscht. Eine darüberhinausgehende Speicherung ist
                    möglich, falls dies zur Aufklärung oder Verfolgung eines konkreten Verstoßes notwendig ist.
                  </p>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    e) Widerspruchs- und Beseitigungsmöglichkeit
                  </h4>
                  <p>
                    Die Erfassung der Daten zur Bereitstellung der Website und die Speicherung in Logfiles ist für den
                    Betrieb der Internetseite zwingend erforderlich. Es besteht folglich seitens des Nutzers keine
                    Widerspruchsmöglichkeit.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Registrierung */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                4. Erhebung und Verarbeitung von Daten bei Registrierung und Nutzung der Plattform
              </h3>
              <div className="space-y-6">

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    a) Registrierung und Profilerstellung (Tierbesitzer)
                  </h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Bei der Registrierung als Tierbesitzer erheben wir als
                      Pflichtangaben: Name, Adresse, E-Mail-Adresse, Telefonnummer, Login-Daten (Benutzername, Passwort).
                      Optional können Sie ein Profilbild, Informationen zu Ihren Haustieren (Art, Rasse, Name, Alter,
                      Geschlecht, besondere Bedürfnisse/Krankheiten, Futtergewohnheiten, Verhaltensweisen), Fotos der
                      Haustiere sowie Tierarztinformationen und Notfallkontakte hinterlegen.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs.
                      1 lit. a DSGVO für freiwillige Angaben. Angaben zu besonderen Bedürfnissen/Krankheiten der Tiere
                      werden auf Basis expliziter Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO verarbeitet.
                    </p>
                    <p>
                      <strong>Zweck:</strong> Erstellung und Verwaltung Ihres Nutzerkontos, Darstellung der
                      Tierinformationen für potenzielle Betreuer und Abwicklung von Buchungen. Notfallkontakte werden dem
                      gebuchten Tierbetreuer bei Ihrer Freigabe zur Verfügung gestellt.
                    </p>
                    <p>
                      <strong>Weitergabe:</strong> Name, Profilbild und Tierinformationen können für Tierbetreuer auf der
                      Plattform sichtbar sein. Tierarztinformationen und Notfallkontakte werden nur dem von Ihnen gebuchten
                      Betreuer bei expliziter Freigabe zugänglich gemacht.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    b) Registrierung und Profilerstellung (Tierbetreuer)
                  </h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Bei der Registrierung als Tierbetreuer erheben wir als
                      Pflichtangaben: Name, Adresse, E-Mail-Adresse, Telefonnummer, Login-Daten (Benutzername, Passwort).
                      Optional können Sie ein Profilbild, eine Beschreibung Ihrer Qualifikation und Erfahrung, Zertifikate,
                      Referenzen, Verfügbarkeiten, Preise, Standort/Servicegebiet sowie Fotos der Betreuungsumgebung
                      angeben.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs.
                      1 lit. a DSGVO für freiwillige Angaben.
                    </p>
                    <p>
                      <strong>Zweck:</strong> Erstellung Ihres Nutzerkontos, Darstellung Ihres Profils für Tierbesitzer,
                      Vermittlung von Betreuungsanfragen und Kommunikation auf der Plattform.
                    </p>
                    <p>
                      <strong>Weitergabe:</strong> Ihr Profil (Name, Profilbild, Beschreibung, Qualifikationen,
                      Verfügbarkeiten, Preise, Servicegebiet, Fotos und Bewertungen) ist auf der Plattform öffentlich für
                      Tierbesitzer und Besucher sichtbar.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">c) Kommunikation über die Plattform</h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Nachrichten, die Sie über unsere interne
                      Nachrichtenfunktion austauschen, werden auf unseren Servern gespeichert. Diese Nachrichten sind uns
                      zur Konfliktlösung und zur Sicherstellung der Einhaltung unserer Nutzungsbedingungen einsehbar.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1
                      lit. f DSGVO (berechtigtes Interesse an Sicherstellung des reibungslosen Ablaufs).
                    </p>
                    <p>
                      <strong>Zweck:</strong> Ermöglichung der Kommunikation zwischen Nutzern, Support und Konfliktlösung.
                    </p>
                    <p>
                      <strong>Speicherort:</strong> Die Kommunikation wird in unserer Datenbank bei Supabase (Serverstandort
                      Frankfurt, Deutschland) gespeichert.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">d) Bewertungen und Rezensionen</h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Nach Abschluss einer Betreuungsleistung können Tierbesitzer
                      und Tierbetreuer sich gegenseitig bewerten und Rezensionen hinterlassen. Diese Bewertungen und die
                      zugehörigen Nutzernamen werden öffentlich auf der Plattform sichtbar.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Abgabe der
                      Bewertung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Transparenz und Vertrauen).
                    </p>
                    <p>
                      <strong>Zweck:</strong> Aufbau von Vertrauen, Qualitätssicherung und Information für andere Nutzer.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">e) Zubehör-Marktplatz</h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Wenn Sie eine Anzeige auf dem tigube-Marktplatz erstellen,
                      erheben und verarbeiten wir folgende Daten: Anzeigentitel, Beschreibung, Kategorie, Angebotstyp
                      (Biete/Suche/Verschenke), Preisangabe, Zustand des Artikels, geeignete Tierarten, Standortangaben
                      (PLZ, Ort) sowie von Ihnen hochgeladene Fotos (max. 6 pro Anzeige). Darüber hinaus speichern wir,
                      welche Anzeigen Sie als Favoriten markiert haben.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung — Bereitstellung des
                      Marktplatz-Dienstes) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Plattformsicherheit
                      und Moderation).
                    </p>
                    <p>
                      <strong>Zweck:</strong> Veröffentlichung und Darstellung Ihrer Anzeige auf dem Marktplatz,
                      Kontaktanbahnung mit Interessenten, Favoritenverwaltung sowie Qualitätssicherung und Moderation
                      (Einhaltung der Marktplatz-Nutzungsbedingungen).
                    </p>
                    <p>
                      <strong>Sichtbarkeit:</strong> Ihre Anzeigen (Titel, Beschreibung, Fotos, Preis, Standort, Kategorie)
                      sind auf der Plattform für alle Besucher öffentlich sichtbar. Ihr vollständiger Name wird dabei
                      <strong> nicht</strong> angezeigt; sichtbar ist lediglich Ihr Vorname und der erste Buchstabe Ihres
                      Nachnamens.
                    </p>
                    <p>
                      <strong>Fotos:</strong> Hochgeladene Fotos werden in unserer Infrastruktur bei Supabase (Serverstandort
                      Frankfurt, Deutschland) gespeichert. Bei Löschung einer Anzeige werden die zugehörigen Fotos ebenfalls
                      gelöscht.
                    </p>
                    <p>
                      <strong>Moderation:</strong> Wir behalten uns vor, Anzeigen zu deaktivieren oder zu löschen, die gegen
                      die Marktplatz-Nutzungsbedingungen oder gesetzliche Vorschriften verstoßen. In diesem Fall werden Sie
                      über den Grund der Maßnahme informiert. Die Begründung wird in Ihrem Nutzerkonto unter „Meine Anzeigen"
                      angezeigt.
                    </p>
                    <p>
                      <strong>Speicherdauer:</strong> Anzeigendaten werden gespeichert, solange die Anzeige aktiv ist oder
                      Ihr Nutzerkonto besteht. Nach Löschung einer Anzeige durch Sie oder durch einen Administrator werden
                      die zugehörigen Daten und Bilder gelöscht. Moderationshinweise verbleiben in Ihrem Konto, solange
                      dieses aktiv ist.
                    </p>
                    <p>
                      <strong>Zustimmung Nutzungsbedingungen:</strong> Beim Erstellen einer Anzeige bestätigen Sie die
                      Marktplatz-Nutzungsbedingungen. Diese Zustimmung wird nicht separat gespeichert; sie ergibt sich aus
                      dem Erstellen der Anzeige.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">f) Abonnement- und Zahlungsabwicklung</h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Beschreibung und Umfang:</strong> Für die Abwicklung der Abonnementzahlungen arbeiten wir mit
                      dem externen Zahlungsdienstleister Stripe zusammen. Wir selbst speichern keine sensiblen
                      Zahlungsdaten wie Kreditkartennummern. Wir erhalten von Stripe lediglich eine Bestätigung über die
                      erfolgreiche Zahlung und eine Referenznummer.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1
                      lit. c DSGVO (Erfüllung rechtlicher Verpflichtungen).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Dritte */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                5. Datenweitergabe an Dritte und Drittanbieter
              </h3>
              <p className="mb-5 leading-relaxed">
                Wir geben Ihre personenbezogenen Daten nur an Dritte weiter, wenn dies zur Erfüllung unserer vertraglichen
                Pflichten, aufgrund einer gesetzlichen Verpflichtung oder zur Wahrung unserer berechtigten Interessen
                erforderlich ist.
              </p>
              <div className="space-y-6">

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">a) Hosting-Anbieter und Datenbank</h4>
                  <ul className="space-y-2 leading-relaxed">
                    <li>
                      <strong>Hosting (Vercel):</strong> Unsere Website wird bei Vercel gehostet.
                    </li>
                    <li>
                      <strong>Datenbank (Supabase):</strong> Unsere Nutzerdatenbank wird bei Supabase mit Serverstandort
                      Frankfurt, Deutschland betrieben.
                    </li>
                  </ul>
                  <p className="mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und lit. f DSGVO.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">b) Zahlungsdienstleister</h4>
                  <p className="leading-relaxed mb-2">
                    <strong>Stripe:</strong> Für die Abwicklung von Abonnementzahlungen nutzen wir Stripe Payments Europe,
                    Ltd. Wenn Sie eine Zahlung tätigen, werden Ihre Zahlungsinformationen direkt an Stripe übermittelt. Wir
                    erhalten lediglich eine Information über den Erfolg oder Misserfolg der Transaktion und eine
                    Transaktions-ID.
                  </p>
                  <p>
                    Datenschutzerklärung von Stripe:{' '}
                    <a
                      href="https://stripe.com/de/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      https://stripe.com/de/privacy
                    </a>
                  </p>
                  <p className="mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und lit. c DSGVO.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    c) Chat-E-Mail-Erinnerungen (Nachrichten)
                  </h4>
                  <p className="leading-relaxed mb-2">
                    Wenn du neue Nachrichten auf tigube erhältst und diese innerhalb einer Stunde nicht liest, können wir
                    dir eine E-Mail-Erinnerung senden. Der Versand erfolgt über unseren eigenen SMTP-Mailserver. In der
                    E-Mail werden weder Absendernamen noch die Anzahl ungelesener Nachrichten genannt — nur ein Hinweis,
                    dass neue Nachrichten vorliegen, mit Link zur Nachrichten-Übersicht.
                  </p>
                  <p className="mb-2">
                    Verarbeitete Daten: E-Mail-Adresse aus deinem Konto, Zeitpunkt der geplanten Erinnerung (interne
                    Reminder-Tabelle). Die Erinnerung wird gelöscht, sobald du alle Nachrichten gelesen hast.
                  </p>
                  <p className="mb-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. vorvertragliche
                    Maßnahmen im Rahmen der Plattform-Kommunikation). Du kannst E-Mail-Erinnerungen jederzeit in den
                    Benachrichtigungseinstellungen im Chat deaktivieren.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">d) Newsletter-Versand</h4>
                  <p className="leading-relaxed mb-2">
                    <strong>Brevo (ehem. Sendinblue):</strong> Für den Versand von Newslettern nutzen wir die Brevo GmbH,
                    Köpenicker Str. 126, 10179 Berlin, Deutschland. Wenn Sie unseren Newsletter abonnieren, werden Ihre
                    E-Mail-Adresse und ggf. weitere angegebene Daten an Brevo übermittelt und dort gespeichert.
                  </p>
                  <p className="mb-2">
                    <strong>Rechtsgrundlage:</strong> Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) durch das
                    Double-Opt-in-Verfahren.
                  </p>
                  <p>
                    Datenschutzerklärung von Brevo:{' '}
                    <a
                      href="https://www.brevo.com/de/legal/privacypolicy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      https://www.brevo.com/de/legal/privacypolicy/
                    </a>
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">e) Marketing (Google Ads, Facebook Ads)</h4>
                  <div className="space-y-3 leading-relaxed">
                    <p>
                      <strong>Google Ads:</strong> Wir nutzen die Dienste Google Ads der Google Ireland Limited. Google Ads
                      verwendet Cookies, um die Performance unserer Anzeigen zu messen und Nutzern relevante Anzeigen
                      anzuzeigen (Remarketing).
                    </p>
                    <p>
                      <strong>Facebook Ads (Meta Pixel):</strong> Wir nutzen das Meta Pixel der Meta Platforms Ireland Ltd.
                      Das Meta Pixel ermöglicht es, die Besucher unserer Website als Zielgruppe für Facebook-Werbeanzeigen
                      zu bestimmen und die Wirksamkeit von Anzeigen zu messen.
                    </p>
                    <p>
                      <strong>Rechtsgrundlage:</strong> Ihre Einwilligung über unser Cookie-Consent-Tool (Art. 6 Abs. 1
                      lit. a DSGVO).
                    </p>
                    <p>
                      Datenschutzerklärungen:{' '}
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Google
                      </a>{' '}
                      |{' '}
                      <a
                        href="https://www.facebook.com/privacy/explanation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        Meta
                      </a>
                    </p>
                    <p className="text-sm bg-amber-50 border border-amber-200 rounded p-3">
                      <strong>Hinweis:</strong> Bei der Nutzung von Google und Meta können Daten in Länder außerhalb der
                      EU/des EWR, insbesondere in die USA, übermittelt werden. Es kommen Standardvertragsklauseln und ggf.
                      zusätzliche Schutzmaßnahmen zum Einsatz.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">e) Webanalyse (Hotjar)</h4>
                  <p className="leading-relaxed mb-2">
                    <strong>Hotjar:</strong> Wir nutzen Hotjar der Hotjar Ltd, Level 2, St Julians Business Centre, 3,
                    Elia Zammit Street, St Julians STJ 3155, Malta. Hotjar ist ein Analysedienst, der das Verhalten der
                    Nutzer auf unserer Website misst und visualisiert. Die IP-Adressen der Nutzer werden dabei
                    anonymisiert.
                  </p>
                  <p className="mb-2">
                    <strong>Rechtsgrundlage:</strong> Ihre Einwilligung über unser Cookie-Consent-Tool (Art. 6 Abs. 1
                    lit. a DSGVO).
                  </p>
                  <p>
                    Datenschutzerklärung von Hotjar:{' '}
                    <a
                      href="https://www.hotjar.com/legal/policies/privacy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      https://www.hotjar.com/legal/policies/privacy/
                    </a>
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">f) Rechtliche Verpflichtungen</h4>
                  <p className="leading-relaxed">
                    In bestimmten Fällen sind wir gesetzlich dazu verpflichtet, personenbezogene Daten an staatliche
                    Behörden, Gerichte oder Dritte weiterzugeben (z.B. auf Anordnung einer Strafverfolgungsbehörde, bei
                    Verdacht auf Betrug). In diesen Fällen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. c
                    DSGVO.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Cookies */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">6. Cookies und ähnliche Technologien</h3>
              <p className="mb-5 leading-relaxed">
                Wir verwenden auf unserer Website Cookies. Cookies sind kleine Textdateien, die auf Ihrem Endgerät
                gespeichert werden. Wir nutzen ein eigenes Cookie-Consent-Tool, das Ihnen die Kontrolle darüber gibt,
                welche Arten von Cookies Sie zulassen möchten.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">a) Notwendige Cookies</h4>
                  <p className="leading-relaxed">
                    Diese Cookies sind für den Betrieb unserer Website unbedingt erforderlich (z.B. Login-Bereich). Ohne
                    diese Cookies kann die Website nicht ordnungsgemäß funktionieren.
                    <br />
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und lit. f DSGVO.
                  </p>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">b) Analyse-Cookies (Hotjar)</h4>
                  <p className="leading-relaxed">
                    Diese Cookies ermöglichen es uns, das Nutzerverhalten auf unserer Website zu analysieren und unsere
                    Dienste zu verbessern (siehe Punkt 5.e).
                    <br />
                    <strong>Rechtsgrundlage:</strong> Ihre Einwilligung über unser Cookie-Consent-Tool (Art. 6 Abs. 1
                    lit. a DSGVO).
                  </p>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    c) Marketing-Cookies (Google Ads, Facebook Ads)
                  </h4>
                  <p className="leading-relaxed">
                    Diese Cookies werden verwendet, um Ihnen relevante und auf Ihre Interessen zugeschnittene Anzeigen
                    anzuzeigen (siehe Punkt 5.d).
                    <br />
                    <strong>Rechtsgrundlage:</strong> Ihre Einwilligung über unser Cookie-Consent-Tool (Art. 6 Abs. 1
                    lit. a DSGVO).
                  </p>
                </div>
              </div>
              <p className="mt-4 leading-relaxed text-sm text-gray-600">
                Sie können Ihre Cookie-Einstellungen jederzeit über unser Cookie-Consent-Tool anpassen. Die meisten
                Browser sind so eingestellt, dass sie Cookies automatisch akzeptieren. Sie können das Speichern von
                Cookies jedoch in Ihren Browser-Einstellungen deaktivieren.
              </p>
            </section>

            {/* 7. Rechte */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                7. Ihre Rechte als betroffene Person
              </h3>
              <p className="mb-5 leading-relaxed">
                Nach der DSGVO stehen Ihnen umfassende Rechte bezüglich der Verarbeitung Ihrer personenbezogenen Daten zu:
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">a) Recht auf Auskunft (Art. 15 DSGVO)</h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, Auskunft darüber zu verlangen, ob und welche personenbezogenen Daten von Ihnen
                    verarbeitet werden.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">b) Recht auf Berichtigung (Art. 16 DSGVO)</h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, die unverzügliche Berichtigung unrichtiger oder die Vervollständigung Ihrer bei
                    uns gespeicherten personenbezogenen Daten zu verlangen.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">
                    c) Recht auf Löschung – „Recht auf Vergessenwerden" (Art. 17 DSGVO)
                  </h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen,
                    soweit nicht die Verarbeitung zur Erfüllung einer rechtlichen Verpflichtung, aus Gründen des
                    öffentlichen Interesses oder zur Geltendmachung von Rechtsansprüchen erforderlich ist.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">
                    d) Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)
                  </h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen,
                    soweit bestimmte gesetzliche Voraussetzungen (z.B. streitige Richtigkeit der Daten) vorliegen.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">
                    e) Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
                  </h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, Ihre personenbezogenen Daten in einem strukturierten, gängigen und
                    maschinenlesbaren Format zu erhalten oder die Übermittlung an einen anderen Verantwortlichen zu
                    verlangen.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">
                    f) Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)
                  </h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sie haben das Recht, Ihre einmal erteilte Einwilligung zur Verarbeitung von Daten jederzeit mit
                    Wirkung für die Zukunft zu widerrufen. Der Widerruf berührt nicht die Rechtmäßigkeit der aufgrund der
                    Einwilligung bis zum Widerruf erfolgten Verarbeitung.
                  </p>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">
                    g) Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)
                  </h4>
                  <p className="leading-relaxed text-sm mt-1 mb-2">
                    Sie haben das Recht auf Beschwerde bei einer Aufsichtsbehörde, wenn Sie der Ansicht sind, dass die
                    Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt.
                  </p>
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <p className="font-medium">Zuständige Aufsichtsbehörde:</p>
                    <p>Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg</p>
                    <p>Königstraße 10a</p>
                    <p>70173 Stuttgart</p>
                  </div>
                </div>
                <div className="border-l-4 border-primary-200 pl-4">
                  <h4 className="font-semibold text-gray-800">h) Widerspruchsrecht (Art. 21 DSGVO)</h4>
                  <p className="leading-relaxed text-sm mt-1">
                    Sofern Ihre personenbezogenen Daten auf Grundlage von berechtigten Interessen gemäß Art. 6 Abs. 1
                    lit. f DSGVO verarbeitet werden, haben Sie das Recht, Widerspruch gegen die Verarbeitung einzulegen,
                    soweit dafür Gründe vorliegen, die sich aus Ihrer besonderen Situation ergeben, oder sich der
                    Widerspruch gegen Direktwerbung richtet.
                  </p>
                </div>
              </div>
              <p className="mt-5">
                Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter{' '}
                <a href="mailto:datenschutz@tigube.de" className="text-primary-600 hover:underline">
                  datenschutz@tigube.de
                </a>
                .
              </p>
            </section>

            {/* 8. Kinder */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">8. Datenschutz für Kinder</h3>
              <p className="leading-relaxed">
                Unsere Plattform richtet sich ausschließlich an volljährige Nutzer. Wir sammeln wissentlich keine
                personenbezogenen Daten von Kindern unter 16 Jahren. Sollten wir Kenntnis davon erhalten, dass uns Daten
                von Kindern unter 16 Jahren ohne elterliche Zustimmung übermittelt wurden, werden wir diese unverzüglich
                löschen.
              </p>
            </section>

            {/* 9. Änderungen */}
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">9. Änderungen der Datenschutzerklärung</h3>
              <p className="leading-relaxed">
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen
                Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen. Für Ihren erneuten Besuch gilt
                dann die neue Datenschutzerklärung. Über wesentliche Änderungen werden wir Sie per E-Mail oder durch
                einen gut sichtbaren Hinweis auf unserer Website informieren.
              </p>
            </section>

            {/* Kontakt-Box */}
            <section className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Kontakt bei Datenschutzfragen</h3>
              <div className="space-y-1">
                <p className="font-semibold">tierisch gut betreut GmbH</p>
                <p>Iznangerstr. 32, 78345 Moos</p>
                <p>
                  E-Mail:{' '}
                  <a href="mailto:datenschutz@tigube.de" className="text-primary-600 hover:underline">
                    datenschutz@tigube.de
                  </a>
                </p>
              </div>
            </section>

            {/* Stand */}
            <section className="text-sm text-gray-500 border-t pt-6">
              <p>
                <strong>Stand dieser Datenschutzerklärung:</strong> 22.03.2026
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatenschutzPage;