"use client"

import Link from "next/link"
import Image from "next/image"
import { SettingsDialog } from "./settings"

export function Header() {
  return (
    <header className="h-app-header fixed top-0 right-0 left-0 z-10">
      <div className="h-app-header top-app-header bg-background pointer-events-none absolute left-0 z-50 mx-auto w-full to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
      <div className="bg-background relative mx-auto flex h-full max-w-full items-center justify-between px-2 lg:bg-transparent">
        <Link href="/">
          <Image 
            src="/yapsdotchat.svg"
            alt="yapsdotchat" 
            className="rounded-full cursor-pointer"
            width={36}
            height={36}
          />
        </Link>
        <div className="flex items-center gap-4">
          <SettingsDialog />
        </div>
      </div>
    </header>
  )
}
