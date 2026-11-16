// Approximate coordinates [latitude N, longitude E] of major places, used only to find the Lagna (ascendant).
const C = {
  hyderabad: [17.385, 78.487], secunderabad: [17.44, 78.498], warangal: [17.969, 79.594], karimnagar: [18.439, 79.129], nizamabad: [18.673, 78.094],
  khammam: [17.247, 80.151], nalgonda: [17.058, 79.268], mahbubnagar: [16.749, 77.986], adilabad: [19.664, 78.532], ramagundam: [18.755, 79.475],
  siddipet: [18.102, 78.852], medak: [18.045, 78.261], suryapet: [17.141, 79.624], sangareddy: [17.624, 78.087], mancherial: [18.868, 79.459],
  kothagudem: [17.554, 80.619], jagtial: [18.79, 78.912], miryalaguda: [16.873, 79.563], nirmal: [19.096, 78.344], vikarabad: [17.338, 77.904],
  bhongir: [17.514, 78.889], kamareddy: [18.322, 78.34], zaheerabad: [17.682, 77.605],
  visakhapatnam: [17.687, 83.218], vijayawada: [16.506, 80.648], guntur: [16.307, 80.437], nellore: [14.443, 79.987], kurnool: [15.828, 78.037],
  rajahmundry: [17.0, 81.804], kakinada: [16.989, 82.248], tirupati: [13.629, 79.419], kadapa: [14.467, 78.824], anantapur: [14.682, 77.601],
  eluru: [16.711, 81.095], ongole: [15.506, 80.05], machilipatnam: [16.188, 81.139], srikakulam: [18.295, 83.894], vizianagaram: [18.107, 83.396],
  chittoor: [13.217, 79.1], tenali: [16.243, 80.64], proddatur: [14.75, 78.548], nandyal: [15.479, 78.484], hindupur: [13.828, 77.491],
  bhimavaram: [16.545, 81.521], amaravati: [16.513, 80.517], madanapalle: [13.55, 78.503],
  chennai: [13.083, 80.271], coimbatore: [11.017, 76.956], madurai: [9.925, 78.12], tiruchirappalli: [10.79, 78.705], salem: [11.664, 78.146],
  tirunelveli: [8.714, 77.757], tiruppur: [11.109, 77.341], erode: [11.341, 77.717], vellore: [12.917, 79.133], thoothukudi: [8.764, 78.135],
  thanjavur: [10.787, 79.138], dindigul: [10.367, 77.98], kanchipuram: [12.834, 79.704], nagercoil: [8.183, 77.412], karur: [10.96, 78.077],
  hosur: [12.741, 77.825], kumbakonam: [10.962, 79.388], cuddalore: [11.748, 79.771], sivakasi: [9.453, 77.798], namakkal: [11.219, 78.167],
  bengaluru: [12.972, 77.595], bangalore: [12.972, 77.595], mysuru: [12.296, 76.639], hubballi: [15.365, 75.124], dharwad: [15.459, 75.008],
  mangaluru: [12.914, 74.856], belagavi: [15.85, 74.498], kalaburagi: [17.33, 76.834], ballari: [15.139, 76.921], vijayapura: [16.83, 75.71],
  shivamogga: [13.93, 75.568], tumakuru: [13.338, 77.117], davanagere: [14.464, 75.922], udupi: [13.341, 74.742], hassan: [13.007, 76.1],
  raichur: [16.208, 77.346], bidar: [17.91, 77.52], mandya: [12.522, 76.895],
  thiruvananthapuram: [8.524, 76.937], kochi: [9.931, 76.267], kozhikode: [11.259, 75.78], thrissur: [10.528, 76.214], kollam: [8.893, 76.614],
  kannur: [11.875, 75.37], alappuzha: [9.498, 76.339], palakkad: [10.787, 76.655], kottayam: [9.592, 76.522], malappuram: [11.051, 76.071],
  mumbai: [19.076, 72.878], pune: [18.52, 73.857], nagpur: [21.146, 79.088], nashik: [19.998, 73.79], thane: [19.218, 72.978],
  aurangabad: [19.876, 75.343], 'chhatrapati sambhajinagar': [19.876, 75.343], solapur: [17.66, 75.906], kolhapur: [16.705, 74.243],
  amravati: [20.937, 77.78], 'navi mumbai': [19.033, 73.03], nanded: [19.138, 77.321], sangli: [16.852, 74.582], jalgaon: [21.008, 75.563],
  akola: [20.7, 77.008], latur: [18.409, 76.56],
  delhi: [28.614, 77.209], 'new delhi': [28.614, 77.209], noida: [28.536, 77.391], ghaziabad: [28.669, 77.454], gurugram: [28.46, 77.027],
  faridabad: [28.409, 77.318], ahmedabad: [23.023, 72.571], surat: [21.17, 72.831], vadodara: [22.307, 73.181], rajkot: [22.304, 70.802],
  bhavnagar: [21.765, 72.152], jamnagar: [22.471, 70.058], gandhinagar: [23.216, 72.637],
  jaipur: [26.912, 75.787], jodhpur: [26.239, 73.024], udaipur: [24.585, 73.713], kota: [25.214, 75.865], bikaner: [28.023, 73.312], ajmer: [26.45, 74.64],
  lucknow: [26.847, 80.946], kanpur: [26.45, 80.332], varanasi: [25.318, 82.974], agra: [27.177, 78.008], prayagraj: [25.436, 81.846],
  meerut: [28.985, 77.706], bareilly: [28.367, 79.43], gorakhpur: [26.761, 83.373],
  kolkata: [22.573, 88.364], howrah: [22.596, 88.264], durgapur: [23.52, 87.312], asansol: [23.674, 86.952], siliguri: [26.727, 88.395],
  bhopal: [23.26, 77.413], indore: [22.72, 75.858], gwalior: [26.218, 78.183], jabalpur: [23.182, 79.986], ujjain: [23.177, 75.788],
  patna: [25.594, 85.138], gaya: [24.791, 85.0], muzaffarpur: [26.121, 85.365], bhagalpur: [25.243, 86.984],
  bhubaneswar: [20.296, 85.825], cuttack: [20.463, 85.883], rourkela: [22.26, 84.854], puri: [19.813, 85.831],
  ludhiana: [30.901, 75.857], amritsar: [31.634, 74.872], jalandhar: [31.326, 75.576], patiala: [30.34, 76.387], chandigarh: [30.733, 76.779],
  panipat: [29.391, 76.964], ambala: [30.378, 76.777], rohtak: [28.896, 76.607],
  raipur: [21.251, 81.63], bhilai: [21.209, 81.379], bilaspur: [22.08, 82.141], ranchi: [23.344, 85.31], jamshedpur: [22.805, 86.203], dhanbad: [23.796, 86.43],
  guwahati: [26.145, 91.736], dibrugarh: [27.473, 94.912], silchar: [24.833, 92.779], dehradun: [30.317, 78.032], haridwar: [29.946, 78.164],
  shimla: [31.105, 77.173], panaji: [15.491, 73.828], srinagar: [34.084, 74.797], jammu: [32.727, 74.857], leh: [34.153, 77.577], puducherry: [11.942, 79.808],
  itanagar: [27.084, 93.605], imphal: [24.817, 93.937], shillong: [25.579, 91.893], aizawl: [23.727, 92.718], kohima: [25.675, 94.109],
  gangtok: [27.331, 88.614], agartala: [23.832, 91.287], 'port blair': [11.623, 92.727],
  dubai: [25.205, 55.271], 'abu dhabi': [24.454, 54.377], doha: [25.285, 51.531], muscat: [23.588, 58.383], riyadh: [24.714, 46.675],
  'kuwait city': [29.376, 47.977], singapore: [1.352, 103.82], 'kuala lumpur': [3.139, 101.687], london: [51.507, -0.128],
  'new york': [40.713, -74.006], chicago: [41.878, -87.63], houston: [29.76, -95.37], dallas: [32.777, -96.797], 'san francisco': [37.775, -122.419],
  seattle: [47.606, -122.332], atlanta: [33.749, -84.388], toronto: [43.653, -79.383], sydney: [-33.869, 151.209], melbourne: [-37.814, 144.963],
  dhaka: [23.81, 90.413], kathmandu: [27.717, 85.324],
}

export const KNOWN_PLACES = Object.keys(C).map(k => k.replace(/\b\w/g, c => c.toUpperCase())).sort()

// Finds coordinates for text like "Hyderabad, Telangana" or "Chhatrapati Sambhajinagar (Aurangabad)"
export function coordsFor(text) {
  const tokens = String(text || '').toLowerCase().split(/[,()]/).map(s => s.trim()).filter(Boolean)
  for (const t of tokens) if (C[t]) return { lat: C[t][0], lon: C[t][1], name: t }
  for (const t of tokens) {
    const key = Object.keys(C).find(k => k.length >= 5 && t.includes(k))
    if (key) return { lat: C[key][0], lon: C[key][1], name: key }
  }
  return null
}
