import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Sélectionner...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Guard: ne rien faire si les options ou selected ne sont pas des tableaux valides
  if (!Array.isArray(options) || !Array.isArray(selected)) {
    return null
  }

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value))
  }

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <span className="truncate">
            {selected.length > 0
              ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-[200px] p-0 bg-background" align="start">
        <Command>
          <CommandInput placeholder="Rechercher..." className="h-9" />
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandList>
            <CommandGroup className="max-h-64 overflow-auto">
              {options && options.length > 0 ? options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              )) : (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Aucune option disponible
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
