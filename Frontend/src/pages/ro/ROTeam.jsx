import React from 'react';
import { Users } from 'lucide-react';
import OnboardTeamForm from '../../components/forms/OnboardTeamForm';

const ROTeam = () => {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Users className="text-emerald-500 w-8 h-8" />
                        Team Management
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Manage monitoring ground staff accounts and assignments.</p>
                </div>
            </div>

            <div className="flex justify-center items-start mt-10">
                <div className="w-full max-w-2xl">
                    <OnboardTeamForm />
                </div>
            </div>
        </div>
    );
};

export default ROTeam;
