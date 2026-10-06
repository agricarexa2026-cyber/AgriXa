import { MdMenuBook } from 'react-icons/md'
import FarmerLayout from '../../components/layout/FarmerLayout'
import KnowledgeSearch from '../../components/knowledge/KnowledgeSearch'

export default function FarmerAgriXa() {
    return (
        <FarmerLayout>
            <div className='app-page flex flex-col gap-5'>

                {/* PAGE HEADER */}
                <header className='flex items-center gap-4'>
                    <div
                        className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-200 bg-white shadow-sm'
                        style={{
                            color: '#3f8746',
                        }}
                    >
                        <MdMenuBook size={25} />
                    </div>

                    <div className='min-w-0'>
                        <p
                            className='text-[11px] font-extrabold uppercase tracking-[0.2em]'
                            style={{
                                color: '#34763c',
                            }}
                        >
                            Agricultural Knowledge Assistant
                        </p>

                        <h1
                            className='mt-0.5 text-[30px] font-extrabold leading-tight tracking-tight'
                            style={{
                                color: '#173d1c',
                            }}
                        >
                            AgriXa
                        </h1>

                        <p
                            className='mt-1 max-w-3xl text-sm font-medium leading-6'
                            style={{
                                color: '#4f6252',
                            }}
                        >
                            Search trusted agricultural knowledge and practical
                            guidance published by your LGU support team.
                        </p>
                    </div>
                </header>

                {/* AGRIXA SEARCH + KNOWLEDGE LIBRARY */}
                <KnowledgeSearch />

            </div>
        </FarmerLayout>
    )
}