import React, { useState, useEffect } from 'react';

export default function QueueForm({ isOpen, onClose, onSubmit, initialData = null, isLoading = false, mode = 'create' }) {
    const [formData, setFormData] = useState({
        name: '',
        maxSize: '',
        serviceSlots: 1,
        graceTime: 1
    });

    // Initialize form with data when opening or when initialData changes
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || '',
                maxSize: initialData.maxSize || '',
                serviceSlots: initialData.serviceSlots || '',
                graceTime: initialData.graceTime || ''
            });
        } else if (isOpen) {
            // Reset form for create mode
            setFormData({
                name: '',
                maxSize: '',
                serviceSlots: '',
                graceTime: ''
            });
        }
    }, [isOpen, initialData]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(formData)
        await onSubmit(formData);
    };

    const isEditMode = mode === 'edit';
    const buttonText = isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Queue' : 'Create Queue');
    const modalTitle = isEditMode ? 'Update Queue' : 'Create New Queue';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 rounded-xl border p-8 w-full max-w-md"
                style={{
                    backgroundColor: '#18181F',
                    borderColor: 'rgba(229, 231, 235, 0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-6 text-white">{modalTitle}</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Queue Name */}
                    <div>
                        <label className="text-sm font-semibold block mb-2 text-white">
                            Queue Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Bank Counter A"
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>

                    {/* Max Size */}
                    <div>
                        <label className="text-sm font-semibold block mb-2 text-white">
                            Max Queue Size (Optional)
                        </label>
                        <input
                            type="number"
                            name="maxSize"
                            value={formData.maxSize}
                            onChange={handleInputChange}
                            placeholder="e.g., 50"

                            disabled={isLoading}
                            className="w-full px-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>

                    {/* Serving Slots */}
                    <div>
                        <label className="text-sm font-semibold block mb-2 text-white">
                            Service Slots (Concurrent)
                        </label>
                        <input
                            type="number"
                            name="serviceSlots"
                            value={formData.serviceSlots}
                            onChange={handleInputChange}
                            placeholder="default to 1"

                            disabled={isLoading}
                            className="w-full px-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>

                    {/* Grace Time */}
                    <div>
                        <label className="text-sm font-semibold block mb-2 text-white">
                            Grace Time (minutes)
                        </label>
                        <input
                            type="number"
                            name="graceTime"
                            value={formData.graceTime}
                            onChange={handleInputChange}
                            placeholder="default to 30"

                            disabled={isLoading}
                            className="w-full px-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all border disabled:opacity-50"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                            style={{
                                backgroundColor: '#22C55E',
                                color: '#0F0F14'
                            }}
                        >
                            {buttonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}