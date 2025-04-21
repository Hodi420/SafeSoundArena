import { Fragment } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { HexColorPicker } from 'react-colorful';
import { useThemeStore } from '../store/useThemeStore';
import { motion } from 'framer-motion';

const fonts = [
  { id: 'fira-code', name: 'Fira Code', description: 'Modern monospace' },
  { id: 'orbitron', name: 'Orbitron', description: 'Sci-fi geometric' },
  { id: 'rajdhani', name: 'Rajdhani', description: 'Tech-inspired sans' },
] as const;

const styles = [
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Sharp edges & neon' },
  { id: 'minimal', name: 'Minimal', description: 'Clean & focused' },
  { id: 'retro', name: 'Retro', description: 'Classic tech vibes' },
] as const;

const speeds = [
  { id: 'fast', name: 'Fast', description: 'Quick transitions' },
  { id: 'normal', name: 'Normal', description: 'Balanced speed' },
  { id: 'slow', name: 'Slow', description: 'Smooth & steady' },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeCustomizer({ isOpen, onClose }: Props) {
  const {
    font,
    primaryColor,
    secondaryColor,
    uiStyle,
    animationSpeed,
    setFont,
    setPrimaryColor,
    setSecondaryColor,
    setUiStyle,
    setAnimationSpeed,
  } = useThemeStore();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl card">
                <Dialog.Title className="text-2xl font-bold text-blue-400 neon-text mb-6">
                  Customize Interface
                </Dialog.Title>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">Font Style</h3>
                    <Listbox value={font} onChange={setFont}>
                      <div className="relative mt-1">
                        {fonts.map((option) => (
                          <Listbox.Option
                            key={option.id}
                            value={option.id}
                            className={({ active, selected }) =>
                              `relative cursor-pointer select-none py-3 px-4 ${
                                selected
                                  ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                  : active
                                  ? 'bg-blue-600/10'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className={option.id}>
                                <div className="font-medium">{option.name}</div>
                                <div className="text-sm text-gray-400">
                                  {option.description}
                                </div>
                                {selected && (
                                  <motion.div
                                    layoutId="font-check"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500"
                                  >
                                    ✓
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </Listbox.Option>
                        ))}
                      </div>
                    </Listbox>

                    <h3 className="text-lg font-semibold text-blue-400 mt-6 mb-4">UI Style</h3>
                    <Listbox value={uiStyle} onChange={setUiStyle}>
                      <div className="relative mt-1">
                        {styles.map((option) => (
                          <Listbox.Option
                            key={option.id}
                            value={option.id}
                            className={({ active, selected }) =>
                              `relative cursor-pointer select-none py-3 px-4 ${
                                selected
                                  ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                  : active
                                  ? 'bg-blue-600/10'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <>
                                <div className="font-medium">{option.name}</div>
                                <div className="text-sm text-gray-400">
                                  {option.description}
                                </div>
                                {selected && (
                                  <motion.div
                                    layoutId="style-check"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500"
                                  >
                                    ✓
                                  </motion.div>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">Colors</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Primary Color
                        </label>
                        <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Secondary Color
                        </label>
                        <HexColorPicker color={secondaryColor} onChange={setSecondaryColor} />
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-blue-400 mt-6 mb-4">
                      Animation Speed
                    </h3>
                    <Listbox value={animationSpeed} onChange={setAnimationSpeed}>
                      <div className="relative mt-1">
                        {speeds.map((option) => (
                          <Listbox.Option
                            key={option.id}
                            value={option.id}
                            className={({ active, selected }) =>
                              `relative cursor-pointer select-none py-3 px-4 ${
                                selected
                                  ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                  : active
                                  ? 'bg-blue-600/10'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <>
                                <div className="font-medium">{option.name}</div>
                                <div className="text-sm text-gray-400">
                                  {option.description}
                                </div>
                                {selected && (
                                  <motion.div
                                    layoutId="speed-check"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500"
                                  >
                                    ✓
                                  </motion.div>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </div>
                    </Listbox>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button className="btn-secondary" onClick={onClose}>
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
