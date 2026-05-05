/**
 * Lieux de délivrance des pièces d'identité françaises :
 * préfectures, sous-préfectures (chefs-lieux d'arrondissement) et consulats de France à l'étranger.
 *
 * Format : { ville, code, type } où :
 *   - type = 'prefecture' | 'sous-prefecture' | 'consulat'
 *   - code = numéro de département (FR) ou nom du pays (consulat)
 */

import { DEPARTEMENTS } from './departements.js'

const SOUS_PREFECTURES = [
  // 01 Ain
  { ville: 'Belley', code: '01' }, { ville: 'Gex', code: '01' }, { ville: 'Nantua', code: '01' },
  // 02 Aisne
  { ville: 'Château-Thierry', code: '02' }, { ville: 'Saint-Quentin', code: '02' },
  { ville: 'Soissons', code: '02' }, { ville: 'Vervins', code: '02' },
  // 03 Allier
  { ville: 'Montluçon', code: '03' }, { ville: 'Vichy', code: '03' },
  // 04 Alpes-de-Haute-Provence
  { ville: 'Barcelonnette', code: '04' }, { ville: 'Castellane', code: '04' }, { ville: 'Forcalquier', code: '04' },
  // 05 Hautes-Alpes
  { ville: 'Briançon', code: '05' },
  // 06 Alpes-Maritimes
  { ville: 'Grasse', code: '06' },
  // 07 Ardèche
  { ville: 'Largentière', code: '07' }, { ville: 'Tournon-sur-Rhône', code: '07' },
  // 08 Ardennes
  { ville: 'Rethel', code: '08' }, { ville: 'Sedan', code: '08' }, { ville: 'Vouziers', code: '08' },
  // 09 Ariège
  { ville: 'Pamiers', code: '09' }, { ville: 'Saint-Girons', code: '09' },
  // 10 Aube
  { ville: 'Bar-sur-Aube', code: '10' }, { ville: 'Nogent-sur-Seine', code: '10' },
  // 11 Aude
  { ville: 'Limoux', code: '11' }, { ville: 'Narbonne', code: '11' },
  // 12 Aveyron
  { ville: 'Millau', code: '12' }, { ville: 'Villefranche-de-Rouergue', code: '12' },
  // 13 Bouches-du-Rhône
  { ville: 'Aix-en-Provence', code: '13' }, { ville: 'Arles', code: '13' }, { ville: 'Istres', code: '13' },
  // 14 Calvados
  { ville: 'Bayeux', code: '14' }, { ville: 'Lisieux', code: '14' }, { ville: 'Vire', code: '14' },
  // 15 Cantal
  { ville: 'Mauriac', code: '15' }, { ville: 'Saint-Flour', code: '15' },
  // 16 Charente
  { ville: 'Cognac', code: '16' }, { ville: 'Confolens', code: '16' },
  // 17 Charente-Maritime
  { ville: 'Jonzac', code: '17' }, { ville: 'Rochefort', code: '17' },
  { ville: 'Saintes', code: '17' }, { ville: 'Saint-Jean-d’Angély', code: '17' },
  // 18 Cher
  { ville: 'Saint-Amand-Montrond', code: '18' }, { ville: 'Vierzon', code: '18' },
  // 19 Corrèze
  { ville: 'Brive-la-Gaillarde', code: '19' }, { ville: 'Ussel', code: '19' },
  // 21 Côte-d'Or
  { ville: 'Beaune', code: '21' }, { ville: 'Montbard', code: '21' },
  // 22 Côtes-d'Armor
  { ville: 'Dinan', code: '22' }, { ville: 'Guingamp', code: '22' }, { ville: 'Lannion', code: '22' },
  // 23 Creuse
  { ville: 'Aubusson', code: '23' },
  // 24 Dordogne
  { ville: 'Bergerac', code: '24' }, { ville: 'Nontron', code: '24' }, { ville: 'Sarlat-la-Canéda', code: '24' },
  // 25 Doubs
  { ville: 'Montbéliard', code: '25' }, { ville: 'Pontarlier', code: '25' },
  // 26 Drôme
  { ville: 'Die', code: '26' }, { ville: 'Nyons', code: '26' },
  // 27 Eure
  { ville: 'Bernay', code: '27' }, { ville: 'Les Andelys', code: '27' },
  // 28 Eure-et-Loir
  { ville: 'Châteaudun', code: '28' }, { ville: 'Dreux', code: '28' }, { ville: 'Nogent-le-Rotrou', code: '28' },
  // 29 Finistère
  { ville: 'Brest', code: '29' }, { ville: 'Châteaulin', code: '29' }, { ville: 'Morlaix', code: '29' },
  // 30 Gard
  { ville: 'Alès', code: '30' }, { ville: 'Le Vigan', code: '30' },
  // 31 Haute-Garonne
  { ville: 'Muret', code: '31' }, { ville: 'Saint-Gaudens', code: '31' },
  // 32 Gers
  { ville: 'Condom', code: '32' }, { ville: 'Mirande', code: '32' },
  // 33 Gironde
  { ville: 'Arcachon', code: '33' }, { ville: 'Blaye', code: '33' }, { ville: 'Langon', code: '33' },
  { ville: 'Lesparre-Médoc', code: '33' }, { ville: 'Libourne', code: '33' },
  // 34 Hérault
  { ville: 'Béziers', code: '34' }, { ville: 'Lodève', code: '34' },
  // 35 Ille-et-Vilaine
  { ville: 'Fougères', code: '35' }, { ville: 'Redon', code: '35' }, { ville: 'Saint-Malo', code: '35' },
  // 36 Indre
  { ville: 'Issoudun', code: '36' }, { ville: 'La Châtre', code: '36' }, { ville: 'Le Blanc', code: '36' },
  // 37 Indre-et-Loire
  { ville: 'Chinon', code: '37' }, { ville: 'Loches', code: '37' },
  // 38 Isère
  { ville: 'La Tour-du-Pin', code: '38' }, { ville: 'Vienne', code: '38' },
  // 39 Jura
  { ville: 'Dole', code: '39' }, { ville: 'Saint-Claude', code: '39' },
  // 40 Landes
  { ville: 'Dax', code: '40' },
  // 41 Loir-et-Cher
  { ville: 'Romorantin-Lanthenay', code: '41' }, { ville: 'Vendôme', code: '41' },
  // 42 Loire
  { ville: 'Montbrison', code: '42' }, { ville: 'Roanne', code: '42' },
  // 43 Haute-Loire
  { ville: 'Brioude', code: '43' }, { ville: 'Yssingeaux', code: '43' },
  // 44 Loire-Atlantique
  { ville: 'Ancenis', code: '44' }, { ville: 'Châteaubriant', code: '44' }, { ville: 'Saint-Nazaire', code: '44' },
  // 45 Loiret
  { ville: 'Montargis', code: '45' }, { ville: 'Pithiviers', code: '45' },
  // 46 Lot
  { ville: 'Figeac', code: '46' }, { ville: 'Gourdon', code: '46' },
  // 47 Lot-et-Garonne
  { ville: 'Marmande', code: '47' }, { ville: 'Nérac', code: '47' }, { ville: 'Villeneuve-sur-Lot', code: '47' },
  // 48 Lozère
  { ville: 'Florac', code: '48' },
  // 49 Maine-et-Loire
  { ville: 'Cholet', code: '49' }, { ville: 'Saumur', code: '49' }, { ville: 'Segré', code: '49' },
  // 50 Manche
  { ville: 'Avranches', code: '50' }, { ville: 'Cherbourg-en-Cotentin', code: '50' }, { ville: 'Coutances', code: '50' },
  // 51 Marne
  { ville: 'Épernay', code: '51' }, { ville: 'Reims', code: '51' },
  { ville: 'Sainte-Ménehould', code: '51' }, { ville: 'Vitry-le-François', code: '51' },
  // 52 Haute-Marne
  { ville: 'Langres', code: '52' }, { ville: 'Saint-Dizier', code: '52' },
  // 53 Mayenne
  { ville: 'Château-Gontier', code: '53' }, { ville: 'Mayenne', code: '53' },
  // 54 Meurthe-et-Moselle
  { ville: 'Briey', code: '54' }, { ville: 'Lunéville', code: '54' }, { ville: 'Toul', code: '54' },
  // 55 Meuse
  { ville: 'Commercy', code: '55' }, { ville: 'Verdun', code: '55' },
  // 56 Morbihan
  { ville: 'Lorient', code: '56' }, { ville: 'Pontivy', code: '56' },
  // 57 Moselle
  { ville: 'Forbach', code: '57' }, { ville: 'Sarrebourg', code: '57' },
  { ville: 'Sarreguemines', code: '57' }, { ville: 'Thionville', code: '57' },
  // 58 Nièvre
  { ville: 'Château-Chinon', code: '58' }, { ville: 'Clamecy', code: '58' }, { ville: 'Cosne-Cours-sur-Loire', code: '58' },
  // 59 Nord
  { ville: 'Avesnes-sur-Helpe', code: '59' }, { ville: 'Cambrai', code: '59' },
  { ville: 'Douai', code: '59' }, { ville: 'Dunkerque', code: '59' }, { ville: 'Valenciennes', code: '59' },
  // 60 Oise
  { ville: 'Clermont', code: '60' }, { ville: 'Compiègne', code: '60' }, { ville: 'Senlis', code: '60' },
  // 61 Orne
  { ville: 'Argentan', code: '61' }, { ville: 'Mortagne-au-Perche', code: '61' },
  // 62 Pas-de-Calais
  { ville: 'Béthune', code: '62' }, { ville: 'Boulogne-sur-Mer', code: '62' },
  { ville: 'Calais', code: '62' }, { ville: 'Lens', code: '62' },
  { ville: 'Montreuil', code: '62' }, { ville: 'Saint-Omer', code: '62' },
  // 63 Puy-de-Dôme
  { ville: 'Ambert', code: '63' }, { ville: 'Issoire', code: '63' },
  { ville: 'Riom', code: '63' }, { ville: 'Thiers', code: '63' },
  // 64 Pyrénées-Atlantiques
  { ville: 'Bayonne', code: '64' }, { ville: 'Oloron-Sainte-Marie', code: '64' },
  // 65 Hautes-Pyrénées
  { ville: 'Argelès-Gazost', code: '65' }, { ville: 'Bagnères-de-Bigorre', code: '65' },
  // 66 Pyrénées-Orientales
  { ville: 'Céret', code: '66' }, { ville: 'Prades', code: '66' },
  // 67 Bas-Rhin
  { ville: 'Haguenau', code: '67' }, { ville: 'Molsheim', code: '67' },
  { ville: 'Saverne', code: '67' }, { ville: 'Sélestat', code: '67' }, { ville: 'Wissembourg', code: '67' },
  // 68 Haut-Rhin
  { ville: 'Altkirch', code: '68' }, { ville: 'Mulhouse', code: '68' },
  { ville: 'Ribeauvillé', code: '68' }, { ville: 'Thann', code: '68' },
  // 69 Rhône
  { ville: 'Villefranche-sur-Saône', code: '69' },
  // 70 Haute-Saône
  { ville: 'Lure', code: '70' },
  // 71 Saône-et-Loire
  { ville: 'Autun', code: '71' }, { ville: 'Chalon-sur-Saône', code: '71' },
  { ville: 'Charolles', code: '71' }, { ville: 'Louhans', code: '71' },
  // 72 Sarthe
  { ville: 'La Flèche', code: '72' }, { ville: 'Mamers', code: '72' },
  // 73 Savoie
  { ville: 'Albertville', code: '73' }, { ville: 'Saint-Jean-de-Maurienne', code: '73' },
  // 74 Haute-Savoie
  { ville: 'Bonneville', code: '74' }, { ville: 'Saint-Julien-en-Genevois', code: '74' }, { ville: 'Thonon-les-Bains', code: '74' },
  // 76 Seine-Maritime
  { ville: 'Dieppe', code: '76' }, { ville: 'Le Havre', code: '76' },
  // 77 Seine-et-Marne
  { ville: 'Fontainebleau', code: '77' }, { ville: 'Meaux', code: '77' },
  { ville: 'Provins', code: '77' }, { ville: 'Torcy', code: '77' },
  // 78 Yvelines
  { ville: 'Mantes-la-Jolie', code: '78' }, { ville: 'Rambouillet', code: '78' }, { ville: 'Saint-Germain-en-Laye', code: '78' },
  // 79 Deux-Sèvres
  { ville: 'Bressuire', code: '79' }, { ville: 'Parthenay', code: '79' },
  // 80 Somme
  { ville: 'Abbeville', code: '80' }, { ville: 'Montdidier', code: '80' }, { ville: 'Péronne', code: '80' },
  // 81 Tarn
  { ville: 'Castres', code: '81' },
  // 82 Tarn-et-Garonne
  { ville: 'Castelsarrasin', code: '82' },
  // 83 Var
  { ville: 'Brignoles', code: '83' }, { ville: 'Draguignan', code: '83' },
  // 84 Vaucluse
  { ville: 'Apt', code: '84' }, { ville: 'Carpentras', code: '84' },
  // 85 Vendée
  { ville: 'Fontenay-le-Comte', code: '85' }, { ville: 'Les Sables-d’Olonne', code: '85' },
  // 86 Vienne
  { ville: 'Châtellerault', code: '86' }, { ville: 'Montmorillon', code: '86' },
  // 87 Haute-Vienne
  { ville: 'Bellac', code: '87' }, { ville: 'Rochechouart', code: '87' },
  // 88 Vosges
  { ville: 'Neufchâteau', code: '88' }, { ville: 'Saint-Dié-des-Vosges', code: '88' },
  // 89 Yonne
  { ville: 'Avallon', code: '89' }, { ville: 'Sens', code: '89' },
  // 91 Essonne
  { ville: 'Étampes', code: '91' }, { ville: 'Palaiseau', code: '91' },
  // 92 Hauts-de-Seine
  { ville: 'Antony', code: '92' }, { ville: 'Boulogne-Billancourt', code: '92' },
  // 93 Seine-Saint-Denis
  { ville: 'Le Raincy', code: '93' }, { ville: 'Saint-Denis', code: '93' },
  // 94 Val-de-Marne
  { ville: 'L’Haÿ-les-Roses', code: '94' }, { ville: 'Nogent-sur-Marne', code: '94' },
  // 95 Val-d'Oise
  { ville: 'Argenteuil', code: '95' }, { ville: 'Pontoise', code: '95' }, { ville: 'Sarcelles', code: '95' },
  // Outre-mer
  { ville: 'Pointe-à-Pitre', code: '971' },
  { ville: 'Le Marin', code: '972' }, { ville: 'La Trinité', code: '972' }, { ville: 'Saint-Pierre', code: '972' },
  { ville: 'Saint-Laurent-du-Maroni', code: '973' },
  { ville: 'Saint-Benoît', code: '974' }, { ville: 'Saint-Paul', code: '974' }, { ville: 'Saint-Pierre', code: '974' },
]

const CONSULATS = [
  // Europe
  { ville: 'Bruxelles', pays: 'Belgique' }, { ville: 'Anvers', pays: 'Belgique' },
  { ville: 'Genève', pays: 'Suisse' }, { ville: 'Berne', pays: 'Suisse' }, { ville: 'Zurich', pays: 'Suisse' },
  { ville: 'Madrid', pays: 'Espagne' }, { ville: 'Barcelone', pays: 'Espagne' }, { ville: 'Bilbao', pays: 'Espagne' },
  { ville: 'Lisbonne', pays: 'Portugal' }, { ville: 'Porto', pays: 'Portugal' },
  { ville: 'Rome', pays: 'Italie' }, { ville: 'Milan', pays: 'Italie' }, { ville: 'Naples', pays: 'Italie' }, { ville: 'Turin', pays: 'Italie' },
  { ville: 'Berlin', pays: 'Allemagne' }, { ville: 'Munich', pays: 'Allemagne' },
  { ville: 'Francfort', pays: 'Allemagne' }, { ville: 'Hambourg', pays: 'Allemagne' }, { ville: 'Stuttgart', pays: 'Allemagne' },
  { ville: 'Londres', pays: 'Royaume-Uni' }, { ville: 'Édimbourg', pays: 'Royaume-Uni' },
  { ville: 'Dublin', pays: 'Irlande' },
  { ville: 'Amsterdam', pays: 'Pays-Bas' },
  { ville: 'Luxembourg', pays: 'Luxembourg' },
  { ville: 'Vienne', pays: 'Autriche' },
  { ville: 'Prague', pays: 'Tchéquie' },
  { ville: 'Varsovie', pays: 'Pologne' }, { ville: 'Cracovie', pays: 'Pologne' },
  { ville: 'Stockholm', pays: 'Suède' },
  { ville: 'Helsinki', pays: 'Finlande' },
  { ville: 'Oslo', pays: 'Norvège' },
  { ville: 'Copenhague', pays: 'Danemark' },
  { ville: 'Bucarest', pays: 'Roumanie' },
  { ville: 'Sofia', pays: 'Bulgarie' },
  { ville: 'Budapest', pays: 'Hongrie' },
  { ville: 'Belgrade', pays: 'Serbie' },
  { ville: 'Zagreb', pays: 'Croatie' },
  { ville: 'Athènes', pays: 'Grèce' }, { ville: 'Thessalonique', pays: 'Grèce' },
  { ville: 'Istanbul', pays: 'Turquie' }, { ville: 'Ankara', pays: 'Turquie' },
  { ville: 'Moscou', pays: 'Russie' }, { ville: 'Saint-Pétersbourg', pays: 'Russie' },
  { ville: 'Kiev', pays: 'Ukraine' },
  // Amériques
  { ville: 'New York', pays: 'États-Unis' }, { ville: 'Washington', pays: 'États-Unis' },
  { ville: 'Los Angeles', pays: 'États-Unis' }, { ville: 'Boston', pays: 'États-Unis' },
  { ville: 'Miami', pays: 'États-Unis' }, { ville: 'Chicago', pays: 'États-Unis' },
  { ville: 'San Francisco', pays: 'États-Unis' }, { ville: 'Houston', pays: 'États-Unis' }, { ville: 'Atlanta', pays: 'États-Unis' },
  { ville: 'Montréal', pays: 'Canada' }, { ville: 'Toronto', pays: 'Canada' },
  { ville: 'Vancouver', pays: 'Canada' }, { ville: 'Québec', pays: 'Canada' },
  { ville: 'Mexico', pays: 'Mexique' },
  { ville: 'Buenos Aires', pays: 'Argentine' },
  { ville: 'São Paulo', pays: 'Brésil' }, { ville: 'Rio de Janeiro', pays: 'Brésil' }, { ville: 'Brasília', pays: 'Brésil' },
  { ville: 'Santiago', pays: 'Chili' },
  { ville: 'Lima', pays: 'Pérou' },
  { ville: 'Bogota', pays: 'Colombie' },
  // Afrique
  { ville: 'Casablanca', pays: 'Maroc' }, { ville: 'Rabat', pays: 'Maroc' },
  { ville: 'Tanger', pays: 'Maroc' }, { ville: 'Agadir', pays: 'Maroc' }, { ville: 'Marrakech', pays: 'Maroc' }, { ville: 'Fès', pays: 'Maroc' },
  { ville: 'Alger', pays: 'Algérie' }, { ville: 'Oran', pays: 'Algérie' }, { ville: 'Annaba', pays: 'Algérie' },
  { ville: 'Tunis', pays: 'Tunisie' }, { ville: 'Sfax', pays: 'Tunisie' },
  { ville: 'Le Caire', pays: 'Égypte' }, { ville: 'Alexandrie', pays: 'Égypte' },
  { ville: 'Dakar', pays: 'Sénégal' },
  { ville: 'Abidjan', pays: 'Côte d’Ivoire' },
  { ville: 'Libreville', pays: 'Gabon' },
  { ville: 'Yaoundé', pays: 'Cameroun' }, { ville: 'Douala', pays: 'Cameroun' },
  { ville: 'Abuja', pays: 'Nigeria' }, { ville: 'Lagos', pays: 'Nigeria' },
  { ville: 'Johannesburg', pays: 'Afrique du Sud' }, { ville: 'Le Cap', pays: 'Afrique du Sud' },
  { ville: 'Nairobi', pays: 'Kenya' },
  { ville: 'Antananarivo', pays: 'Madagascar' },
  { ville: 'Bamako', pays: 'Mali' },
  { ville: 'Ouagadougou', pays: 'Burkina Faso' },
  // Moyen-Orient & Asie
  { ville: 'Beyrouth', pays: 'Liban' },
  { ville: 'Tel Aviv', pays: 'Israël' }, { ville: 'Jérusalem', pays: 'Israël' },
  { ville: 'Doha', pays: 'Qatar' },
  { ville: 'Dubaï', pays: 'Émirats arabes unis' }, { ville: 'Abou Dabi', pays: 'Émirats arabes unis' },
  { ville: 'Riyad', pays: 'Arabie saoudite' },
  { ville: 'Téhéran', pays: 'Iran' },
  { ville: 'Tokyo', pays: 'Japon' }, { ville: 'Osaka', pays: 'Japon' }, { ville: 'Kyoto', pays: 'Japon' },
  { ville: 'Pékin', pays: 'Chine' }, { ville: 'Shanghai', pays: 'Chine' },
  { ville: 'Hong Kong', pays: 'Chine' }, { ville: 'Canton', pays: 'Chine' },
  { ville: 'Séoul', pays: 'Corée du Sud' },
  { ville: 'Singapour', pays: 'Singapour' },
  { ville: 'Bangkok', pays: 'Thaïlande' },
  { ville: 'Hanoï', pays: 'Viêt Nam' }, { ville: 'Hô-Chi-Minh-Ville', pays: 'Viêt Nam' },
  { ville: 'Mumbai', pays: 'Inde' }, { ville: 'New Delhi', pays: 'Inde' }, { ville: 'Pondichéry', pays: 'Inde' },
  // Océanie
  { ville: 'Sydney', pays: 'Australie' },
  { ville: 'Wellington', pays: 'Nouvelle-Zélande' },
]

/**
 * Liste unifiée des lieux de délivrance.
 * Chaque entrée a la forme :
 *   { libelle, recherche, type } où :
 *   - libelle : valeur stockée (ex. "Besançon (25)" ou "Tokyo (Japon)")
 *   - recherche : chaîne pré-normalisée pour la recherche full-text
 *   - type : 'préfecture', 'sous-préfecture' ou 'consulat'
 */
function buildLieux() {
  const out = []

  DEPARTEMENTS.forEach((d) => {
    out.push({
      libelle: `${d.prefecture} (${d.code})`,
      type: 'préfecture',
      ville: d.prefecture,
      code: d.code,
      nom: d.nom,
    })
  })

  SOUS_PREFECTURES.forEach((s) => {
    const dpt = DEPARTEMENTS.find((d) => d.code === s.code)
    out.push({
      libelle: `${s.ville} (${s.code})`,
      type: 'sous-préfecture',
      ville: s.ville,
      code: s.code,
      nom: dpt?.nom ?? '',
    })
  })

  CONSULATS.forEach((c) => {
    out.push({
      libelle: `${c.ville} (${c.pays})`,
      type: 'consulat',
      ville: c.ville,
      code: c.pays,
      nom: c.pays,
    })
  })

  return out
}

export const LIEUX_DELIVRANCE = buildLieux()
