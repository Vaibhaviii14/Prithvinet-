import React from 'react';
import { MapPin } from 'lucide-react';
import AddLocationForm from '../../components/forms/AddLocationForm';

const ROLocations = () => {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <MapPin className="text-emerald-500 w-8 h-8" />
                        Locations & Sensors
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Manage monitoring sites and deploy new sensor stations.</p>
                </div>
            </div>

            <div className="flex justify-center items-start mt-10">
                <div className="w-full max-w-2xl">
                    <AddLocationForm />
                </div>
            </div>
        </div>
    );
};

export default ROLocations;
