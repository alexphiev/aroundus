'use client'

import SearchPageComponent from '@/components/search/SearchPageComponent'
import { Suspense } from 'react'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageComponent />
    </Suspense>
  )
}
