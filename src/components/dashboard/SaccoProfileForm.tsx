// FILE: src/components/dashboard/SaccoProfileForm.tsx
// ACTION: NEW
//
// Client form for editing the SACCO's basic profile info.
// Admin can update name, email, phone, district, address.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const UGANDA_DISTRICTS = [
  "Abim","Adjumani","Agago","Alebtong","Amolatar","Amuria","Amuru","Apac","Arua",
  "Budaka","Bududa","Bugiri","Buikwe","Bukedea","Bukomansimbi","Bukwa","Bulambuli",
  "Buliisa","Bundibugyo","Bunyangabu","Bushenyi","Busia","Butaleja","Butebo",
  "Buvuma","Buyende","Dokolo","Gomba","Gulu","Hoima","Ibanda","Iganga","Isingiro",
  "Jinja","Kaabong","Kabale","Kabarole","Kaberamaido","Kagadi","Kakumiro","Kalaki",
  "Kalangala","Kaliro","Kalungu","Kampala","Kamuli","Kamwenge","Kanungu","Kapchorwa",
  "Kapelebyong","Kasanda","Kasese","Katakwi","Kayunga","Kazo","Kibale","Kiboga",
  "Kibuku","Kikuube","Kiruhura","Kiryandongo","Kisoro","Kitgum","Koboko","Kole",
  "Kotido","Kumi","Kwania","Kween","Kyankwanzi","Kyegegwa","Kyenjojo","Kyotera",
  "Lamwo","Lira","Luuka","Luwero","Lwengo","Lyantonde","Manafwa","Maracha","Masaka",
  "Masindi","Mayuge","Mbale","Mbarara","Mitooma","Mityana","Moroto","Moyo","Mpigi",
  "Mubende","Mukono","Nakapiripirit","Nakaseke","Nakasongola","Namayingo",
  "Namisindwa","Namutumba","Napak","Nebbi","Ngora","Ntoroko","Ntungamo","Nwoya",
  "Omoro","Otuke","Oyam","Pader","Pakwach","Pallisa","Rakai","Rubanda","Rubirizi",
  "Rukiga","Rukungiri","Rwampara","Sembabule","Serere","Sheema","Sironko","Soroti",
  "Tororo","Wakiso","Yumbe","Zombo",
]

type SaccoData = {
  id:              string
  name:            string
  registration_no: string | null
  email:           string
  phone:           string | null
  address:         string | null
  district:        string | null
}

export default function SaccoProfileForm({ sacco }: { sacco: SaccoData }) {
  const router = useRouter()

  const [name, setName]               = useState(sacco.name)
  const [regNo, setRegNo]             = useState(sacco.registration_no ?? "")
  const [email, setEmail]             = useState(sacco.email)
  const [phone, setPhone]             = useState(sacco.phone ?? "")
  const [address, setAddress]         = useState(sacco.address ?? "")
  const [district, setDistrict]       = useState(sacco.district ?? "")
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isSuccess, setIsSuccess]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    const supabase = createClient()

    const { error: err } = await supabase
      .from("saccos")
      .update({
        name:            name.trim(),
        registration_no: regNo.trim() || null,
        email:           email.trim(),
        phone:           phone.trim() || null,
        address:         address.trim() || null,
        district:        district || null,
      })
      .eq("id", sacco.id)

    if (err) {
      setError(err.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">Profile updated successfully!</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          SACCO name <span className="text-red-500">*</span>
        </label>
        <input type="text" required
          value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Registration number <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input type="text"
          placeholder="e.g. MFPED/SACCO/2024/001"
          value={regNo} onChange={(e) => setRegNo(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone</label>
          <input type="tel"
            placeholder="+256 700 000 000"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">District</label>
        <select
          value={district} onChange={(e) => setDistrict(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">Select district...</option>
          {UGANDA_DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Physical address</label>
        <input type="text"
          placeholder="e.g. Plot 14, Kampala Road"
          value={address} onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isLoading}
          className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : "Save Profile"
          }
        </button>
      </div>
    </form>
  )
}
