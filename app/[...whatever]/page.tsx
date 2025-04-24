'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function GroupCodeRedirect() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // TODO:
    // Extract the first segment from the [...whatever] array
    // params.groupCode will be an array because of [...groupCode]
    // const something = Array.isArray(params.whatever) ? params.whatever[0] : null
    
    // if (something && /^[A-Za-z0-9]{6}$/.test(something)) {
    //   // Valid 6-digit alphanumeric code, redirect to home with the code
    //   router.replace(`/?code=${something}`)
    // } else {
    //   // Invalid or missing code, just redirect to home
    //   router.replace('/')
    // }

    // let's just redirect to home for now
    router.replace('/')
  }, [params.whatever, router])
  
  // Return empty while redirecting
  return null
}
