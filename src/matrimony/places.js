// State / city suggestions for India (major cities). Users can still type any other city.
export const OUTSIDE = 'Outside India'

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry', OUTSIDE,
]

export const CITIES = {
  'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda', 'Mahbubnagar', 'Adilabad', 'Ramagundam', 'Siddipet', 'Medak', 'Suryapet', 'Sangareddy', 'Mancherial', 'Kothagudem', 'Jagtial', 'Miryalaguda', 'Nirmal', 'Vikarabad', 'Wanaparthy', 'Bhongir', 'Kamareddy', 'Zaheerabad', 'Gadwal', 'Jangaon', 'Mahabubabad', 'Armoor', 'Bodhan', 'Tandur'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada', 'Tirupati', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Machilipatnam', 'Srikakulam', 'Vizianagaram', 'Chittoor', 'Tenali', 'Proddatur', 'Nandyal', 'Hindupur', 'Bhimavaram', 'Amaravati', 'Madanapalle', 'Guntakal', 'Dharmavaram', 'Tadepalligudem', 'Narasaraopet', 'Chirala'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Nagercoil', 'Karur', 'Hosur', 'Kumbakonam', 'Cuddalore', 'Sivakasi', 'Namakkal', 'Pudukkottai', 'Tiruvannamalai'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Davanagere', 'Udupi', 'Hassan', 'Raichur', 'Bidar', 'Mandya', 'Chitradurga', 'Kolar', 'Hosapete', 'Gadag', 'Chikkamagaluru'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Kottayam', 'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad', 'Ernakulam', 'Muvattupuzha', 'Thalassery'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Ahmednagar', 'Dhule', 'Ichalkaranji', 'Satara', 'Ratnagiri', 'Panvel', 'Kalyan', 'Vasai-Virar', 'Pimpri-Chinchwad', 'Bhiwandi', 'Chandrapur', 'Parbhani'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Janakpuri', 'Karol Bagh', 'Pitampura', 'Laxmi Nagar', 'Najafgarh', 'Shahdara'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Navsari', 'Vapi', 'Bhuj', 'Porbandar', 'Surendranagar', 'Gandhidham', 'Patan'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Bharatpur', 'Pali', 'Sri Ganganagar', 'Chittorgarh', 'Jhunjhunu', 'Tonk', 'Barmer', 'Hanumangarh', 'Bundi', 'Jaisalmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad', 'Noida', 'Greater Noida', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Saharanpur', 'Jhansi', 'Mathura', 'Firozabad', 'Muzaffarnagar', 'Ayodhya', 'Etawah', 'Mirzapur', 'Rampur', 'Shahjahanpur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur', 'Haldia', 'Darjeeling', 'Cooch Behar', 'Berhampore', 'Krishnanagar', 'Jalpaiguri', 'Bankura', 'Purulia'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Chhindwara', 'Morena', 'Bhind', 'Vidisha'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Samastipur', 'Hajipur', 'Sasaram', 'Motihari'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Angul'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Moga', 'Batala', 'Firozpur', 'Phagwara', 'Kapurthala', 'Sangrur', 'Barnala'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Rohtak', 'Karnal', 'Sonipat', 'Yamunanagar', 'Panchkula', 'Bhiwani', 'Sirsa', 'Jind', 'Kurukshetra', 'Rewari', 'Kaithal'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'Medininagar'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Pithoragarh'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Hamirpur', 'Una', 'Palampur', 'Bilaspur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Chandigarh': ['Chandigarh'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Pasighat'],
  'Manipur': ['Imphal', 'Thoubal', 'Churachandpur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Kailashahar'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Lakshadweep': ['Kavaratti'],
}

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/^nct of /, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

// maps a state name returned by a PIN lookup to one of our STATES (or '' if unknown)
export function matchState(name) {
  const n = norm(name)
  return STATES.find(s => norm(s) === n) || ''
}
