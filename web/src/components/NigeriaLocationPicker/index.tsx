'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ICity, IState, Country, State, City } from 'country-state-city';
import styles from './NigeriaLocationPicker.module.css';

export type LocationValue = {
    state: string;      // e.g. "Lagos State"
    city: string;       // e.g. "Ikeja"
    country: string;    // e.g. "Nigeria"
    stateCode: string;  // e.g. "LA"
};

interface NigeriaLocationPickerProps {
    value?: Partial<LocationValue>;
    onChange: (value: LocationValue) => void;
    /** Show a country selector too (for non-Nigerian sellers). Defaults false = Nigeria only */
    allowOtherCountries?: boolean;
    label?: string;
}

const NIGERIA_ISO = 'NG';

export default function NigeriaLocationPicker({
    value,
    onChange,
    allowOtherCountries = false,
    label = 'Location',
}: NigeriaLocationPickerProps) {
    const [countryCode, setCountryCode] = useState<string>(NIGERIA_ISO);
    const [stateCode, setStateCode] = useState<string>(value?.stateCode || '');
    const [city, setCity] = useState<string>(value?.city || '');
    const [citySearch, setCitySearch] = useState<string>(value?.city || '');
    const [showCityList, setShowCityList] = useState(false);
    const cityRef = useRef<HTMLDivElement>(null);

    const countries = Country.getAllCountries();
    const states: IState[] = State.getStatesOfCountry(countryCode);
    const cities: ICity[] = stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];

    const filteredCities = cities.filter(c =>
        c.name.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 30);

    // Close city dropdown on outside click
    useEffect(() => {
        if (!showCityList) return;
        const handler = (e: MouseEvent) => {
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
                setShowCityList(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCityList]);

    const emitChange = useCallback((sc: string, ct: string, cc: string) => {
        const stateObj = State.getStateByCodeAndCountry(sc, cc);
        const countryObj = Country.getCountryByCode(cc);
        onChange({
            stateCode: sc,
            state: stateObj?.name || sc,
            city: ct,
            country: countryObj?.name || 'Nigeria',
        });
    }, [onChange]);

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCountryCode(e.target.value);
        setStateCode('');
        setCity('');
        setCitySearch('');
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sc = e.target.value;
        setStateCode(sc);
        setCity('');
        setCitySearch('');
        emitChange(sc, '', countryCode);
    };

    const handleCitySelect = (cityName: string) => {
        setCity(cityName);
        setCitySearch(cityName);
        setShowCityList(false);
        emitChange(stateCode, cityName, countryCode);
    };

    return (
        <div className={styles.wrapper}>
            {label && <label className={styles.label}>{label}</label>}

            {allowOtherCountries && (
                <select
                    className={styles.select}
                    value={countryCode}
                    onChange={handleCountryChange}
                >
                    {countries.map(c => (
                        <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>
                    ))}
                </select>
            )}

            <select
                className={styles.select}
                value={stateCode}
                onChange={handleStateChange}
                disabled={states.length === 0}
            >
                <option value="">Select state{countryCode !== NIGERIA_ISO ? ' / region' : ''}</option>
                {states.map(s => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
            </select>

            {stateCode && (
                <div className={styles.cityWrapper} ref={cityRef}>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder={cities.length > 0 ? `Search city / LGA…` : 'Type your city'}
                        value={citySearch}
                        onChange={e => {
                            setCitySearch(e.target.value);
                            setShowCityList(true);
                            if (!e.target.value) {
                                setCity('');
                                emitChange(stateCode, '', countryCode);
                            }
                        }}
                        onFocus={() => setShowCityList(true)}
                        autoComplete="off"
                    />
                    {showCityList && filteredCities.length > 0 && (
                        <ul className={styles.dropdown}>
                            {filteredCities.map(c => (
                                <li key={c.name}>
                                    <button
                                        type="button"
                                        className={`${styles.dropdownItem} ${c.name === city ? styles.dropdownItemActive : ''}`}
                                        onMouseDown={e => { e.preventDefault(); handleCitySelect(c.name); }}
                                    >
                                        {c.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
